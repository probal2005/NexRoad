begin;

create table public.booking_payment_attempts (
  id uuid primary key,
  request_id uuid not null references public.booking_final_charges(request_id) on delete cascade,
  method text not null check (method in ('cash','online')),
  result text not null check (result in ('paid','failed')),
  amount_inr numeric(16,2) not null check (amount_inr >= 0 and amount_inr < 'Infinity'::numeric),
  created_at timestamptz not null default clock_timestamp(),
  check (method='online' or result='paid')
);
create unique index booking_payment_once_idx on public.booking_payment_attempts(request_id) where result='paid';
create index booking_payment_history_idx on public.booking_payment_attempts(request_id,created_at desc,id);
alter table public.booking_payment_attempts enable row level security;
revoke all on public.booking_payment_attempts from public,anon,authenticated;
grant select on public.booking_payment_attempts to authenticated;
create policy "Customer or administrator reads payment attempts" on public.booking_payment_attempts
  for select to authenticated using (
    (select nexroad_private.account_access_allowed()) and exists (
      select 1 from public.service_requests r where r.id=booking_payment_attempts.request_id and (
        r.customer_id=(select auth.uid()) or exists (
          select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='admin'
        )
      )
    )
  );

create function nexroad_private.simulate_booking_payment(p_request_id uuid,p_attempt_id uuid,p_method text,p_succeeds boolean)
returns text language plpgsql security definer set search_path=''
as $$
declare
  customer uuid := auth.uid();
  v_request public.service_requests%rowtype;
  v_amount numeric;
  v_result text := case when p_succeeds then 'paid' else 'failed' end;
  v_existing public.booking_payment_attempts%rowtype;
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id=customer and role='user'
  ) then return null; end if;
  if p_attempt_id is null or p_succeeds is null or p_method is null
    or p_method not in ('cash','online') or (p_method='cash' and not p_succeeds) then return null; end if;

  select * into v_request from public.service_requests r where r.id=p_request_id and r.customer_id=customer
    and r.request_status='completed' for no key update of r;
  if not found then return null; end if;
  select total_inr into v_amount from public.booking_final_charges where request_id=v_request.id;
  if not found then return null; end if;

  select * into v_existing from public.booking_payment_attempts where id=p_attempt_id;
  if found then
    if v_existing.request_id=v_request.id and v_existing.method=p_method and v_existing.result=v_result then
      return v_existing.result;
    end if;
    return null;
  end if;
  if v_request.payment_status in ('paid','refunded') or exists (
    select 1 from public.booking_payment_attempts where request_id=v_request.id and result='paid'
  ) then return 'already_paid'; end if;

  insert into public.booking_payment_attempts(id,request_id,method,result,amount_inr)
  values(p_attempt_id,v_request.id,p_method,v_result,v_amount) on conflict(id) do nothing;
  if not found then return null; end if;
  update public.service_requests set payment_method=p_method,payment_status=v_result where id=v_request.id;
  perform nexroad_private.emit_live_update(customer,'payment');
  return v_result;
end;
$$;

create function nexroad_private.require_simulated_payment()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if old.payment_status is distinct from 'paid' and new.payment_status='paid' and not exists (
    select 1 from public.booking_payment_attempts p join public.booking_final_charges c on c.request_id=p.request_id
    where p.request_id=new.id and p.result='paid' and p.amount_inr=c.total_inr and p.method=new.payment_method
  ) then raise exception 'A verified simulated payment is required'; end if;
  return new;
end;
$$;
revoke all on function nexroad_private.require_simulated_payment() from public,anon,authenticated;
create trigger require_simulated_payment before update of payment_status on public.service_requests
  for each row execute function nexroad_private.require_simulated_payment();

create or replace function nexroad_private.technician_performance()
returns table(completed_jobs bigint, rated_jobs bigint, average_rating numeric, simulated_earnings numeric)
language sql stable security definer set search_path=''
as $$
  select count(*),count(f.rating),avg(f.rating),
    sum(case when r.payment_status='paid' then coalesce(p.amount_inr,charge.total_inr) end)
  from public.service_requests r
  left join public.customer_request_feedback f on f.request_id=r.id
  left join public.booking_final_charges charge on charge.request_id=r.id
  left join public.booking_payment_attempts p on p.request_id=r.id and p.result='paid'
  where nexroad_private.is_approved_technician(auth.uid())
    and r.assigned_technician_id=auth.uid() and r.request_status='completed';
$$;

create table public.booking_chat_messages (
  id bigint generated always as identity primary key,
  client_id uuid not null unique,
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','technician')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp()
);
create index booking_chat_messages_request_idx on public.booking_chat_messages(request_id,id desc);
alter table public.booking_chat_messages enable row level security;
revoke all on public.booking_chat_messages from public,anon,authenticated;
grant select on public.booking_chat_messages to authenticated;

create table nexroad_private.booking_chat_reads (
  request_id uuid not null references public.service_requests(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  through_id bigint not null,
  primary key (request_id,user_id)
);

create function nexroad_private.booking_chat_role(p_request_id uuid)
returns text language sql stable security definer set search_path=''
as $$
  select case
    when r.customer_id=auth.uid() then 'customer'
    when r.assigned_technician_id=auth.uid() and nexroad_private.is_approved_technician(auth.uid()) then 'technician'
  end
  from public.service_requests r where r.id=p_request_id and r.assigned_technician_id is not null
    and r.assigned_technician_id<>r.customer_id and r.request_status in ('accepted','technician_arriving','in_progress','completed')
    and nexroad_private.account_access_allowed()
    and (r.customer_id=auth.uid() or r.assigned_technician_id=auth.uid());
$$;
revoke all on function nexroad_private.booking_chat_role(uuid) from public,anon,authenticated;
grant execute on function nexroad_private.booking_chat_role(uuid) to authenticated;

create policy "Only booking participants read chat" on public.booking_chat_messages
  for select to authenticated using (nexroad_private.booking_chat_role(booking_chat_messages.request_id) is not null);

create function nexroad_private.send_booking_chat(p_request_id uuid,p_client_id uuid,p_body text)
returns bigint language plpgsql security definer set search_path=''
as $$
declare
  booking public.service_requests%rowtype;
  actor_role text;
  message_id bigint;
  message_body text := btrim(p_body);
begin
  if p_client_id is null or not coalesce(char_length(message_body) between 1 and 1000,false) then return null; end if;
  select * into booking from public.service_requests r where r.id=p_request_id
    and (r.customer_id=auth.uid() or r.assigned_technician_id=auth.uid()) for no key update of r;
  if not found then return null; end if;
  actor_role:=nexroad_private.booking_chat_role(booking.id);
  if actor_role is null then return null; end if;

  insert into public.booking_chat_messages(client_id,request_id,sender_role,body)
  values(p_client_id,booking.id,actor_role,message_body) on conflict(client_id) do nothing returning id into message_id;
  if not found then
    return (select id from public.booking_chat_messages where client_id=p_client_id and request_id=booking.id
      and sender_role=actor_role and body=message_body);
  end if;
  perform nexroad_private.emit_live_update(booking.customer_id,'chat');
  perform nexroad_private.emit_live_update(booking.assigned_technician_id,'chat');
  return message_id;
end;
$$;

create function nexroad_private.mark_booking_chat_read(p_request_id uuid,p_through_id bigint)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  if nexroad_private.booking_chat_role(p_request_id) is null or not exists (
    select 1 from public.booking_chat_messages where request_id=p_request_id and id=p_through_id
  ) then return false; end if;
  insert into nexroad_private.booking_chat_reads(request_id,user_id,through_id)
  values(p_request_id,auth.uid(),p_through_id)
  on conflict(request_id,user_id) do update set through_id=excluded.through_id
    where booking_chat_reads.through_id<excluded.through_id;
  if found then perform nexroad_private.emit_live_update(auth.uid(),'chat'); end if;
  return true;
end;
$$;

create function nexroad_private.booking_chat_unread()
returns table(request_id uuid,unread_count bigint)
language sql stable security definer set search_path=''
as $$
  select r.id,count(*)
  from public.service_requests r
  cross join lateral (select nexroad_private.booking_chat_role(r.id) as role) viewer
  left join nexroad_private.booking_chat_reads seen on seen.request_id=r.id and seen.user_id=auth.uid()
  join public.booking_chat_messages m on m.request_id=r.id and m.id>coalesce(seen.through_id,0) and m.sender_role<>viewer.role
  where (r.customer_id=auth.uid() or r.assigned_technician_id=auth.uid()) and viewer.role is not null
  group by r.id;
$$;

create function public.simulate_booking_payment(p_request_id uuid,p_attempt_id uuid,p_method text,p_succeeds boolean)
returns text language sql security invoker set search_path=''
as $$ select nexroad_private.simulate_booking_payment(p_request_id,p_attempt_id,p_method,p_succeeds); $$;
create function public.send_booking_chat(p_request_id uuid,p_client_id uuid,p_body text)
returns bigint language sql security invoker set search_path=''
as $$ select nexroad_private.send_booking_chat(p_request_id,p_client_id,p_body); $$;
create function public.mark_booking_chat_read(p_request_id uuid,p_through_id bigint)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.mark_booking_chat_read(p_request_id,p_through_id); $$;
create function public.booking_chat_unread()
returns table(request_id uuid,unread_count bigint)
language sql stable security invoker set search_path=''
as $$ select * from nexroad_private.booking_chat_unread(); $$;

revoke all on function nexroad_private.simulate_booking_payment(uuid,uuid,text,boolean),public.simulate_booking_payment(uuid,uuid,text,boolean),
  nexroad_private.send_booking_chat(uuid,uuid,text),public.send_booking_chat(uuid,uuid,text),
  nexroad_private.mark_booking_chat_read(uuid,bigint),public.mark_booking_chat_read(uuid,bigint),
  nexroad_private.booking_chat_unread(),public.booking_chat_unread() from public,anon,authenticated;
grant execute on function nexroad_private.simulate_booking_payment(uuid,uuid,text,boolean),public.simulate_booking_payment(uuid,uuid,text,boolean),
  nexroad_private.send_booking_chat(uuid,uuid,text),public.send_booking_chat(uuid,uuid,text),
  nexroad_private.mark_booking_chat_read(uuid,bigint),public.mark_booking_chat_read(uuid,bigint),
  nexroad_private.booking_chat_unread(),public.booking_chat_unread() to authenticated;

create or replace function nexroad_private.create_priced_booking(p_request_id uuid,p_input jsonb,p_expected_quote jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  customer uuid := auth.uid();
  category uuid := (p_input->>'category_id')::uuid;
  vehicle uuid := (p_input->>'vehicle_id')::uuid;
  address text := btrim(p_input->>'service_location');
  v_method text := coalesce(p_input->>'payment_method','cash');
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

  if v_method not in ('cash','online') then raise exception 'Choose a supported payment method'; end if;
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

  insert into public.service_requests(id,customer_id,category_id,vehicle_id,service_location,latitude,longitude,issue_description,payment_method)
  values(p_request_id,customer,category,vehicle,address,(p_input->>'latitude')::double precision,(p_input->>'longitude')::double precision,notes,v_method)
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

commit;
