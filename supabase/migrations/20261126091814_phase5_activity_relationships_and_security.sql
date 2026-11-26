begin;

-- Review alongside the original Step 5.7 migration before choosing which to install.
create schema if not exists nexroad_private;
revoke all on schema nexroad_private from public;
grant usage on schema nexroad_private to authenticated;

alter table public.service_requests
  add column assigned_technician_id uuid references public.user_profiles(id) on delete restrict;

create unique index request_offers_one_accepted_per_request
  on public.request_offers (request_id) where offer_status = 'accepted';

update public.service_requests r
set assigned_technician_id = o.technician_id
from public.request_offers o
where o.request_id = r.id and o.offer_status = 'accepted';

alter table public.service_requests
  add constraint service_requests_active_assignment_check
    check (request_status not in ('accepted', 'technician_arriving', 'in_progress')
           or assigned_technician_id is not null);

-- This invariant also applies to administrative and privileged writes.
create unique index service_requests_one_active_per_technician
  on public.service_requests (assigned_technician_id)
  where request_status in ('accepted', 'technician_arriving', 'in_progress');
create index service_requests_assigned_technician_idx
  on public.service_requests (assigned_technician_id, created_at desc)
  where assigned_technician_id is not null;

alter table public.vehicles add constraint vehicles_id_owner_key unique (id, owner_id);
alter table public.service_requests
  drop constraint service_requests_vehicle_id_fkey,
  add constraint service_requests_vehicle_id_fkey
    foreign key (vehicle_id, customer_id) references public.vehicles (id, owner_id)
    on delete set null (vehicle_id);

create function nexroad_private.is_approved_technician(p_technician_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_profiles p
    join public.technician_applications a on a.user_id = p.id
    where p.id = p_technician_id and p.role = 'technician' and a.status = 'approved'
  );
$$;
revoke all on function nexroad_private.is_approved_technician(uuid) from public, anon, authenticated;
grant execute on function nexroad_private.is_approved_technician(uuid) to authenticated;

alter policy "Users can view their own technician application" on public.technician_applications
  using (user_id = (select auth.uid()));
alter policy "Users view active technician services" on public.technician_services
  using (is_active and nexroad_private.is_approved_technician(technician_id));
alter policy "Technicians view own request offers" on public.request_offers
  using (technician_id = (select auth.uid())
    and (select nexroad_private.is_approved_technician(auth.uid())));

create policy "Approved technicians view assigned requests" on public.service_requests
  for select to authenticated using (
    assigned_technician_id = (select auth.uid())
    and (select nexroad_private.is_approved_technician(auth.uid()))
  );

alter policy "Customers create own service requests" on public.service_requests
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role = 'user'
    )
    and exists (
      select 1 from public.service_categories c where c.id = category_id and c.is_active
    )
    and (vehicle_id is null or exists (
      select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
    ))
    and request_status = 'requested' and payment_status = 'pending'
    and assigned_technician_id is null and service_outcome is null
    and accepted_at is null and completed_at is null and cancelled_at is null
    and requested_at = now() and created_at = now() and updated_at = now()
  );

create table public.request_activity_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.service_requests(id) on delete cascade,
  offer_id uuid references public.request_offers(id) on delete set null,
  technician_id uuid,
  event_type text not null check (event_type in ('request_status', 'offer_status')),
  previous_status text,
  new_status text not null,
  created_at timestamptz not null default now(),
  check ((event_type = 'request_status' and offer_id is null and technician_id is null)
      or (event_type = 'offer_status' and technician_id is not null))
);

create index request_activity_request_timeline_idx
  on public.request_activity_history (request_id, created_at desc, id desc);
create index request_activity_technician_timeline_idx
  on public.request_activity_history (technician_id, created_at desc, id desc)
  where technician_id is not null;
create index request_activity_offer_idx on public.request_activity_history (offer_id)
  where offer_id is not null;

alter table public.request_activity_history enable row level security;
revoke all on public.request_activity_history from public, anon, authenticated;
grant select on public.request_activity_history to authenticated;

create policy "Participants read permitted activity" on public.request_activity_history
  for select to authenticated using (
    exists (
      select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role = 'admin'
    )
    or (
      event_type = 'request_status' and exists (
        select 1 from public.service_requests r where r.id = request_id and (
          r.customer_id = (select auth.uid()) or (
            r.assigned_technician_id = (select auth.uid())
            and (select nexroad_private.is_approved_technician(auth.uid()))
          )
        )
      )
    )
    or (
      event_type = 'offer_status' and technician_id = (select auth.uid())
      and (select nexroad_private.is_approved_technician(auth.uid()))
    )
  );

create function nexroad_private.record_request_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_previous_status text;
begin
  if tg_table_name = 'service_requests' then
    if tg_op = 'UPDATE' then
      v_previous_status := old.request_status;
    end if;
    if v_previous_status is distinct from new.request_status then
      insert into public.request_activity_history (request_id, event_type, previous_status, new_status)
      values (new.id, 'request_status', v_previous_status, new.request_status);
    end if;
  else
    if tg_op = 'UPDATE' then
      v_previous_status := old.offer_status;
    end if;
    if v_previous_status is distinct from new.offer_status then
      insert into public.request_activity_history (
        request_id, offer_id, technician_id, event_type, previous_status, new_status
      ) values (new.request_id, new.id, new.technician_id, 'offer_status', v_previous_status, new.offer_status);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function nexroad_private.record_request_activity() from public, anon, authenticated;

create trigger record_service_request_activity after insert or update of request_status
  on public.service_requests for each row execute function nexroad_private.record_request_activity();
create trigger record_request_offer_activity after insert or update of offer_status
  on public.request_offers for each row execute function nexroad_private.record_request_activity();

create function nexroad_private.accept_request_offer(p_offer_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_technician_id uuid := auth.uid();
  v_request_id uuid;
  v_category_id uuid;
  v_constraint text;
begin
  if v_technician_id is null then
    raise exception 'Authentication required';
  end if;

  -- Look up the parent without locking an offer. Competing acceptances lock
  -- request, then availability, then offers, so no loser holds a sibling offer.
  select o.request_id into v_request_id from public.request_offers o
  where o.id = p_offer_id and o.technician_id = v_technician_id;
  if not found then
    raise exception 'Offer is unavailable or expired';
  end if;

  select r.category_id into v_category_id from public.service_requests r
  where r.id = v_request_id and r.request_status = 'matching'
  for no key update;
  if not found then
    raise exception 'Request is no longer available';
  end if;

  perform 1 from public.technician_availability av
  where av.technician_id = v_technician_id and av.is_online
    and av.accepting_requests and av.location_sharing
  for no key update;
  if not found or not nexroad_private.is_approved_technician(v_technician_id)
    or not exists (
      select 1 from public.technician_services ts
      join public.service_categories c on c.id = ts.category_id
      where ts.technician_id = v_technician_id and ts.category_id = v_category_id
        and ts.is_active and c.is_active
    )
    or not exists (
      select 1 from public.technician_locations loc where loc.technician_id = v_technician_id
        and loc.updated_at >= clock_timestamp() - interval '10 minutes'
    ) then
    raise exception 'Technician is not currently eligible';
  end if;

  update public.request_offers o
  set offer_status = 'accepted', responded_at = clock_timestamp()
  where o.id = p_offer_id and o.request_id = v_request_id and o.technician_id = v_technician_id
    and o.offer_status = 'offered' and o.expires_at > clock_timestamp();
  if not found then
    raise exception 'Offer is unavailable or expired';
  end if;

  update public.service_requests
  set request_status = 'accepted', assigned_technician_id = v_technician_id,
      accepted_at = clock_timestamp()
  where id = v_request_id;

  update public.request_offers
  set offer_status = 'closed', responded_at = clock_timestamp()
  where request_id = v_request_id and id <> p_offer_id and offer_status = 'offered';

  update public.technician_availability
  set accepting_requests = false where technician_id = v_technician_id;

  return jsonb_build_object(
    'success', true, 'request_id', v_request_id, 'offer_id', p_offer_id,
    'status', 'accepted', 'message', 'Request accepted successfully'
  );
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint = 'service_requests_one_active_per_technician' then
    raise exception 'Technician already has an active request' using errcode = '23505';
  end if;
  raise;
end;
$$;

revoke all on function nexroad_private.accept_request_offer(uuid) from public, anon, authenticated;
grant execute on function nexroad_private.accept_request_offer(uuid) to authenticated;

create or replace function public.accept_request_offer(p_offer_id uuid)
returns jsonb
language sql security invoker set search_path = ''
as $$
  select nexroad_private.accept_request_offer(p_offer_id);
$$;
revoke all on function public.accept_request_offer(uuid) from public, anon, authenticated;
grant execute on function public.accept_request_offer(uuid) to authenticated;

commit;
