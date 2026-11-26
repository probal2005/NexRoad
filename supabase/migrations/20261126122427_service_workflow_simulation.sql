begin;

create table public.booking_service_workflow (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  departed_at timestamptz,
  arrived_at timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  summary text check (char_length(summary) between 3 and 1000),
  fuel_litres numeric(4,2) check (fuel_litres between 1 and 50),
  drop_off text check (char_length(drop_off) between 3 and 500),
  mechanical_outcome text check (mechanical_outcome in ('roadside_repair','garage_required','towing_required')),
  followup_request_id uuid unique references public.service_requests(id) on delete set null
);
alter table public.booking_service_workflow enable row level security;
revoke all on public.booking_service_workflow from public,anon,authenticated;
grant select on public.booking_service_workflow to authenticated;

create policy "Booking participants read service workflow" on public.booking_service_workflow
for select to authenticated using (
  (select nexroad_private.account_access_allowed()) and exists (
    select 1 from public.service_requests r where r.id=booking_service_workflow.request_id and (
      r.customer_id=(select auth.uid())
      or (r.assigned_technician_id=(select auth.uid()) and (select nexroad_private.is_approved_technician(auth.uid())))
      or exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='admin')
    )
  )
);

create or replace function nexroad_private.advance_technician_job(
  p_request_id uuid, p_status text, p_outcome text default null
)
returns boolean language plpgsql security definer set search_path=''
as $$
declare changed_at timestamptz := clock_timestamp();
begin
  if not nexroad_private.is_approved_technician(auth.uid()) then
    raise exception using errcode='42501',message='Approved technician required';
  end if;
  if p_outcome is not null then return false; end if;

  update public.service_requests set request_status=p_status
  where id=p_request_id and assigned_technician_id=auth.uid() and (
    (request_status='accepted' and p_status='technician_arriving')
    or (request_status='technician_arriving' and p_status='in_progress')
  );
  if not found then return false; end if;

  insert into public.booking_service_workflow(request_id,departed_at,arrived_at)
  values(p_request_id, case when p_status='technician_arriving' then changed_at end,
    case when p_status='in_progress' then changed_at end)
  on conflict(request_id) do update set
    departed_at=coalesce(booking_service_workflow.departed_at,excluded.departed_at),
    arrived_at=coalesce(booking_service_workflow.arrived_at,excluded.arrived_at);
  return true;
end;
$$;

create function nexroad_private.submit_technician_service(p_request_id uuid,p_report jsonb)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  v_service text;
  v_quoted_litres numeric;
  v_summary text := btrim(p_report->>'summary');
  v_fuel numeric := (p_report->>'fuel_litres')::numeric;
  v_drop_off text := nullif(btrim(p_report->>'drop_off'),'');
  v_outcome text := p_report->>'mechanical_outcome';
begin
  if not nexroad_private.is_approved_technician(auth.uid()) then
    raise exception using errcode='42501',message='Approved technician required';
  end if;

  select c.slug,(price.quote->>'fuel_litres')::numeric into v_service,v_quoted_litres
  from public.service_requests r join public.service_categories c on c.id=r.category_id
  left join public.booking_price_snapshots price on price.request_id=r.id
  where r.id=p_request_id and r.assigned_technician_id=auth.uid() and r.request_status in ('in_progress','completed')
  for no key update of r;
  if not found or not coalesce(char_length(v_summary) between 3 and 1000,false) then return false; end if;

  if not coalesce(case v_service
    when 'fuel' then v_fuel between 1 and 50 and v_fuel=round(v_fuel,2)
      and (v_quoted_litres is null or v_quoted_litres=v_fuel) and v_drop_off is null and v_outcome is null
    when 'towing' then char_length(v_drop_off) between 3 and 500 and v_fuel is null and v_outcome is null
    when 'mechanical' then v_outcome in ('roadside_repair','garage_required','towing_required')
      and v_fuel is null and v_drop_off is null
    else false end,false) then return false; end if;

  if exists(select 1 from public.booking_service_workflow where request_id=p_request_id and submitted_at is not null) then
    return exists(select 1 from public.booking_service_workflow
      where request_id=p_request_id and summary=v_summary and fuel_litres is not distinct from v_fuel
        and drop_off is not distinct from v_drop_off and mechanical_outcome is not distinct from v_outcome);
  end if;
  if not exists(select 1 from public.service_requests where id=p_request_id and request_status='in_progress') then return false; end if;

  insert into public.booking_service_workflow(request_id,submitted_at,summary,fuel_litres,drop_off,mechanical_outcome)
  values(p_request_id,clock_timestamp(),v_summary,v_fuel,v_drop_off,v_outcome)
  on conflict(request_id) do update set submitted_at=excluded.submitted_at,summary=excluded.summary,
    fuel_litres=excluded.fuel_litres,drop_off=excluded.drop_off,mechanical_outcome=excluded.mechanical_outcome;
  return true;
end;
$$;

create function nexroad_private.confirm_customer_service(p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  status text;
  report public.booking_service_workflow%rowtype;
  confirmed timestamptz;
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id=auth.uid() and role='user'
  ) then return false; end if;
  select r.request_status into status from public.service_requests r
    where r.id=p_request_id and r.customer_id=auth.uid() for no key update;
  if not found then return false; end if;

  select * into report from public.booking_service_workflow where request_id=p_request_id;
  if not found or report.submitted_at is null then return false; end if;
  if status='completed' then return report.confirmed_at is not null; end if;
  if status<>'in_progress' then return false; end if;

  confirmed := clock_timestamp();
  update public.booking_service_workflow set confirmed_at=confirmed where request_id=p_request_id;
  update public.service_requests set request_status='completed',service_outcome=report.mechanical_outcome,
    completed_at=confirmed where id=p_request_id;
  return true;
end;
$$;

-- Completion follows an owner-confirmed report even if an operator updates a request directly.
create function nexroad_private.require_service_confirmation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if old.request_status is distinct from 'completed' and new.request_status='completed'
    and not exists(select 1 from public.booking_service_workflow
      where request_id=new.id and confirmed_at is not null) then
    raise exception 'Customer confirmation is required before completion';
  end if;
  return new;
end;
$$;
revoke all on function nexroad_private.require_service_confirmation() from public,anon,authenticated;
create trigger require_service_confirmation before update of request_status on public.service_requests
  for each row execute function nexroad_private.require_service_confirmation();

create function nexroad_private.create_towing_followup(
  p_parent_request_id uuid,p_request_id uuid,p_input jsonb,p_expected_quote jsonb
)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  parent public.service_requests%rowtype;
  linked uuid;
  created uuid;
begin
  if not nexroad_private.account_access_allowed() then return null; end if;

  select r.* into parent from public.service_requests r join public.service_categories c on c.id=r.category_id
  where r.id=p_parent_request_id and r.customer_id=auth.uid() and r.request_status='completed'
    and r.service_outcome='towing_required' and c.slug='mechanical' for no key update of r;
  if not found then return null; end if;

  select followup_request_id into linked from public.booking_service_workflow where request_id=parent.id;
  if linked is not null then
    if linked=p_request_id then
      return nexroad_private.create_priced_booking(p_request_id,p_input,p_expected_quote);
    end if;
    return null;
  end if;
  if (p_input->>'latitude')::double precision is distinct from parent.latitude
    or (p_input->>'longitude')::double precision is distinct from parent.longitude
    or btrim(p_input->>'service_location') is distinct from parent.service_location
    or not exists(select 1 from public.service_categories where id=(p_input->>'category_id')::uuid and slug='towing' and is_active) then
    return null;
  end if;

  created := nexroad_private.create_priced_booking(p_request_id,p_input,p_expected_quote);
  insert into public.booking_service_workflow(request_id,followup_request_id) values(parent.id,created)
    on conflict(request_id) do update set followup_request_id=excluded.followup_request_id;
  return created;
end;
$$;

create function public.submit_technician_service(p_request_id uuid,p_report jsonb)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.submit_technician_service(p_request_id,p_report); $$;
create function public.confirm_customer_service(p_request_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.confirm_customer_service(p_request_id); $$;
create function public.create_towing_followup(p_parent_request_id uuid,p_request_id uuid,p_input jsonb,p_expected_quote jsonb)
returns uuid language sql security invoker set search_path=''
as $$ select nexroad_private.create_towing_followup(p_parent_request_id,p_request_id,p_input,p_expected_quote); $$;

revoke all on function nexroad_private.submit_technician_service(uuid,jsonb),public.submit_technician_service(uuid,jsonb),
  nexroad_private.confirm_customer_service(uuid),public.confirm_customer_service(uuid),
  nexroad_private.create_towing_followup(uuid,uuid,jsonb,jsonb),public.create_towing_followup(uuid,uuid,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function nexroad_private.submit_technician_service(uuid,jsonb),public.submit_technician_service(uuid,jsonb),
  nexroad_private.confirm_customer_service(uuid),public.confirm_customer_service(uuid),
  nexroad_private.create_towing_followup(uuid,uuid,jsonb,jsonb),public.create_towing_followup(uuid,uuid,jsonb,jsonb)
  to authenticated;

commit;
