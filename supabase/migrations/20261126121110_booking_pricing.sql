begin;

create table nexroad_private.fuel_unit_prices (
  fuel_type text primary key check (fuel_type in ('petrol', 'diesel')),
  unit_price_inr numeric(8,2) not null check (unit_price_inr between 0.01 and 999999.99)
);
-- Simulation defaults. Existing administrator-configured service rates take precedence.
insert into nexroad_private.fuel_unit_prices values ('petrol', 100), ('diesel', 90);
insert into nexroad_private.service_price_defaults(category_id,base_price,service_charge,per_km_charge)
select id, rates.base_price, rates.service_charge, rates.per_km_charge
from public.service_categories
join (values ('fuel',100,40,8),('mechanical',250,75,12),('towing',350,75,25))
  as rates(category,base_price,service_charge,per_km_charge) on slug=category
on conflict(category_id) do nothing;

create table public.booking_price_snapshots (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  quote jsonb not null,
  created_at timestamptz not null default now()
);
create table public.booking_final_charges (
  request_id uuid primary key references public.booking_price_snapshots(request_id) on delete cascade,
  total_inr numeric(16,2) not null check (total_inr >= 0 and total_inr < 'Infinity'::numeric),
  created_at timestamptz not null default now()
);
alter table public.booking_price_snapshots enable row level security;
alter table public.booking_final_charges enable row level security;
revoke all on public.booking_price_snapshots,public.booking_final_charges from public,anon,authenticated;
grant select on public.booking_price_snapshots,public.booking_final_charges to authenticated;

-- Request RLS already checks customer ownership, assigned technicians and active accounts.
create policy "Booking participants read price snapshots" on public.booking_price_snapshots
  for select to authenticated using (exists (
    select 1 from public.service_requests r where r.id = request_id
  ));
create policy "Booking participants read final charges" on public.booking_final_charges
  for select to authenticated using (exists (
    select 1 from public.service_requests r where r.id = request_id
  ));

create function nexroad_private.calculate_booking_quote(p_input jsonb)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
  service_slug text;
  base_amount numeric;
  service_amount numeric;
  distance_rate numeric;
  distance_km numeric := 5;
  v_fuel_type text := lower(p_input->>'fuel_type');
  litres numeric;
  fuel_rate numeric;
  fuel_amount numeric := 0;
  distance_amount numeric;
  lat double precision := (p_input->>'latitude')::double precision;
  lon double precision := (p_input->>'longitude')::double precision;
  dest_lat double precision;
  dest_lon double precision;
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id=auth.uid() and role='user'
  ) then raise exception using errcode='42501', message='Active customer account required'; end if;

  if not coalesce(lat between -90 and 90 and lon between -180 and 180,false) then
    raise exception 'Choose valid pickup coordinates';
  end if;

  select c.slug, rates.base_price, rates.service_charge, rates.per_km_charge
  into service_slug, base_amount, service_amount, distance_rate
  from public.service_categories c join nexroad_private.service_price_defaults rates on c.id=rates.category_id
  where c.id=(p_input->>'category_id')::uuid and c.is_active;
  if not found then raise exception 'Service pricing is unavailable'; end if;

  if service_slug='fuel' then
    litres := (p_input->>'fuel_litres')::numeric;
    if not coalesce(litres between 1 and 50 and litres=round(litres,2),false) then
      raise exception 'Enter between 1 and 50 litres';
    end if;
    select unit_price_inr into fuel_rate from nexroad_private.fuel_unit_prices f where f.fuel_type=v_fuel_type;
    if not found then raise exception 'Select a supported fuel type'; end if;
    fuel_amount := round(fuel_rate * litres,2);
  elsif service_slug='towing' then
    dest_lat := (p_input->>'destination_latitude')::double precision;
    dest_lon := (p_input->>'destination_longitude')::double precision;
    if not coalesce(dest_lat between -90 and 90 and dest_lon between -180 and 180,false) then
      raise exception 'Choose valid tow destination coordinates';
    end if;
    distance_km := round((12742.0 * asin(sqrt(least(1.0,
      power(sin(radians(dest_lat-lat)/2),2)
        + cos(radians(lat))*cos(radians(dest_lat))*power(sin(radians(dest_lon-lon)/2),2)
    ))))::numeric,2);
    if distance_km=0 then raise exception 'Tow destination must differ from pickup'; end if;
  end if;

  distance_amount := round(distance_km*distance_rate,2);
  return jsonb_build_object(
    'currency','INR','service',service_slug,'base_inr',base_amount,'service_inr',service_amount,
    'distance_km',distance_km,'distance_rate_inr',distance_rate,'distance_inr',distance_amount,
    'distance_basis',case when service_slug='towing' then 'straight_line' else 'simulated_approach' end,
    'fuel_type',case when service_slug='fuel' then v_fuel_type end,'fuel_litres',litres,
    'fuel_unit_inr',fuel_rate,'fuel_inr',fuel_amount,
    'total_inr',base_amount+service_amount+distance_amount+fuel_amount
  );
end;
$$;

-- Preserve the existing policies and restrict direct inserts to administrators.
-- Customer inserts run through the quote-verifying function below.
create policy "Direct request inserts require administrator" on public.service_requests
  as restrictive for insert to authenticated with check (
    exists (select 1 from public.user_profiles where id=(select auth.uid()) and role='admin')
  );

create function nexroad_private.create_priced_booking(p_request_id uuid,p_input jsonb,p_expected_quote jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  customer uuid := auth.uid();
  category uuid := (p_input->>'category_id')::uuid;
  vehicle uuid := (p_input->>'vehicle_id')::uuid;
  address text := btrim(p_input->>'service_location');
  notes text := nullif(btrim(p_input->>'issue_description'),'');
  destination text := nullif(btrim(p_input->>'destination'),'');
  server_quote jsonb;
  saved_id uuid;
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id=customer and role='user'
  ) then raise exception using errcode='42501', message='Active customer account required'; end if;

  -- A retry after a lost response returns the existing booking without charging again.
  select r.id into saved_id from public.service_requests r join public.booking_price_snapshots p on p.request_id=r.id
    where r.id=p_request_id and r.customer_id=customer and p.quote=p_expected_quote;
  if found then return saved_id; end if;

  if p_request_id is null or not coalesce(char_length(address) between 3 and 500,false) then
    raise exception 'Enter a valid pickup address';
  end if;
  if vehicle is not null and not exists(select 1 from public.vehicles where id=vehicle and owner_id=customer) then
    raise exception 'Choose one of your own vehicles';
  end if;

  server_quote := nexroad_private.calculate_booking_quote(p_input);
  if server_quote is distinct from p_expected_quote then
    raise exception using errcode='22023', message='Price changed. Review the latest estimate and confirm again.';
  end if;

  if server_quote->>'service'='fuel' then
    notes := concat_ws(E'\n',format('Fuel: %s, %s L',server_quote->>'fuel_type',server_quote->>'fuel_litres'),notes);
  elsif server_quote->>'service'='towing' then
    if not coalesce(char_length(destination) between 3 and 500,false) then raise exception 'Enter a valid tow destination'; end if;
    notes := concat_ws(E'\n',format('Tow destination: %s (%s, %s)',destination,p_input->>'destination_latitude',p_input->>'destination_longitude'),notes);
  elsif server_quote->>'service'='mechanical' and notes is null then
    raise exception 'Describe the mechanical issue';
  end if;
  if char_length(notes)>2000 then raise exception 'Keep the booking details within 2,000 characters'; end if;

  insert into public.service_requests(id,customer_id,category_id,vehicle_id,service_location,latitude,longitude,issue_description)
  values(p_request_id,customer,category,vehicle,address,(p_input->>'latitude')::double precision,(p_input->>'longitude')::double precision,notes)
  on conflict(id) do nothing returning id into saved_id;

  if not found then
    select r.id into saved_id from public.service_requests r join public.booking_price_snapshots p on p.request_id=r.id
      where r.id=p_request_id and r.customer_id=customer and p.quote=p_expected_quote;
    if not found then raise exception 'Booking identifier unavailable'; end if;
    return saved_id;
  end if;

  insert into public.booking_price_snapshots(request_id,quote) values(saved_id,server_quote);
  return saved_id;
end;
$$;

create function nexroad_private.record_booking_final_charge()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  amount numeric;
begin
  if old.request_status is distinct from 'completed' and new.request_status='completed' then
    select (p.quote->>'total_inr')::numeric into amount from public.booking_price_snapshots p where p.request_id=new.id;
    if found then
      insert into public.booking_final_charges(request_id,total_inr) values(new.id,amount) on conflict do nothing;
      if not exists (select 1 from public.booking_final_charges where request_id=new.id and total_inr=amount) then
        raise exception 'Final simulated charge does not match the booking snapshot';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger record_booking_final_charge before update of request_status on public.service_requests
  for each row execute function nexroad_private.record_booking_final_charge();

create or replace function nexroad_private.technician_performance()
returns table(completed_jobs bigint, rated_jobs bigint, average_rating numeric, simulated_earnings numeric)
language sql stable security definer set search_path=''
as $$
  select count(*),count(f.rating),avg(f.rating),
    sum(coalesce(charge.total_inr,s.base_price+s.service_charge+coalesce(o.estimated_distance_km,0)*s.per_km_charge))
  from public.service_requests r
  left join public.customer_request_feedback f on f.request_id=r.id
  left join public.booking_final_charges charge on charge.request_id=r.id
  left join public.technician_services s on s.technician_id=r.assigned_technician_id and s.category_id=r.category_id
  left join public.request_offers o on o.request_id=r.id and o.technician_id=r.assigned_technician_id and o.offer_status='accepted'
  where nexroad_private.is_approved_technician(auth.uid())
    and r.assigned_technician_id=auth.uid() and r.request_status='completed';
$$;

create function nexroad_private.admin_fuel_prices()
returns table(fuel_type text, unit_price_inr numeric)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform nexroad_private.require_admin();
  return query select f.fuel_type,f.unit_price_inr from nexroad_private.fuel_unit_prices f order by f.fuel_type;
end;
$$;
create function nexroad_private.admin_set_fuel_price(p_fuel_type text,p_unit_price_inr numeric)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  perform nexroad_private.require_admin();
  if not coalesce(p_unit_price_inr between 0.01 and 999999.99 and p_unit_price_inr=round(p_unit_price_inr,2),false) then
    return false;
  end if;
  update nexroad_private.fuel_unit_prices set unit_price_inr=p_unit_price_inr where fuel_type=p_fuel_type;
  if not found then return false; end if;
  insert into nexroad_private.admin_activity(actor_id,action) values(auth.uid(),'update_fuel_price');
  return true;
end;
$$;

create function public.quote_booking(p_input jsonb)
returns jsonb language sql stable security invoker set search_path=''
as $$ select nexroad_private.calculate_booking_quote(p_input); $$;
create function public.create_priced_booking(p_request_id uuid,p_input jsonb,p_expected_quote jsonb)
returns uuid language sql security invoker set search_path=''
as $$ select nexroad_private.create_priced_booking(p_request_id,p_input,p_expected_quote); $$;
create function public.admin_fuel_prices()
returns table(fuel_type text,unit_price_inr numeric) language sql stable security invoker set search_path=''
as $$ select * from nexroad_private.admin_fuel_prices(); $$;
create function public.admin_set_fuel_price(p_fuel_type text,p_unit_price_inr numeric)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.admin_set_fuel_price(p_fuel_type,p_unit_price_inr); $$;

revoke all on function nexroad_private.record_booking_final_charge(),nexroad_private.calculate_booking_quote(jsonb),
  nexroad_private.create_priced_booking(uuid,jsonb,jsonb),nexroad_private.admin_fuel_prices(),
  nexroad_private.admin_set_fuel_price(text,numeric),public.quote_booking(jsonb),public.create_priced_booking(uuid,jsonb,jsonb),
  public.admin_fuel_prices(),public.admin_set_fuel_price(text,numeric) from public,anon,authenticated;
grant execute on function nexroad_private.calculate_booking_quote(jsonb),nexroad_private.create_priced_booking(uuid,jsonb,jsonb),
  nexroad_private.admin_fuel_prices(),nexroad_private.admin_set_fuel_price(text,numeric),
  public.quote_booking(jsonb),public.create_priced_booking(uuid,jsonb,jsonb),public.admin_fuel_prices(),
  public.admin_set_fuel_price(text,numeric) to authenticated;

commit;
