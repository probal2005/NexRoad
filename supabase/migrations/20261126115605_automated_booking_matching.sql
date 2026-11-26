begin;

create index service_requests_matching_queue_idx
  on public.service_requests (updated_at, id)
  where request_status in ('requested', 'matching');

create index request_offers_open_request_idx
  on public.request_offers (request_id, expires_at)
  where offer_status = 'offered';

create function nexroad_private.dispatch_booking(p_request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  booking public.service_requests%rowtype;
  dispatch_at timestamptz;
  deadline timestamptz;
  radius_km integer;
  next_status text;
begin
  -- Acceptance, cancellation and dispatch all take the parent lock first.
  select * into booking from public.service_requests
    where id = p_request_id for no key update;
  if not found then return null; end if;
  if booking.request_status not in ('requested', 'matching') then return booking.request_status; end if;

  dispatch_at := clock_timestamp();
  deadline := booking.requested_at + interval '15 minutes';

  update public.request_offers
  set offer_status = 'expired', responded_at = dispatch_at
  where request_id = booking.id and offer_status = 'offered'
    and (expires_at <= dispatch_at or deadline <= dispatch_at);

  if deadline <= dispatch_at or not exists (
    select 1 from public.service_categories c where c.id = booking.category_id and c.is_active
  ) then
    update public.request_offers set offer_status = 'closed', responded_at = dispatch_at
      where request_id = booking.id and offer_status = 'offered';
    update public.service_requests set request_status = 'expired' where id = booking.id;
    return 'expired';
  end if;

  if exists (select 1 from public.request_offers
    where request_id = booking.id and offer_status = 'offered' and expires_at > dispatch_at) then
    return 'matching';
  end if;

  select matching_radius_km into strict radius_km from nexroad_private.platform_settings where singleton;

  -- Straight-line approach distance. Exact pickup details remain private until acceptance.
  with candidates as (
    select p.id as technician_id, 12742.0 * asin(sqrt(least(1.0,
      power(sin(radians(l.latitude - booking.latitude) / 2), 2)
      + cos(radians(booking.latitude)) * cos(radians(l.latitude))
        * power(sin(radians(l.longitude - booking.longitude) / 2), 2)
    ))) as distance_km
    from public.technician_services s
    join public.user_profiles p on p.id = s.technician_id and p.role = 'technician'
    join public.technician_applications a on a.user_id = p.id and a.status = 'approved'
    join public.technician_availability av on av.technician_id = p.id
    join public.technician_locations l on l.technician_id = p.id
    where s.category_id = booking.category_id and s.is_active
      and av.is_online and av.accepting_requests and av.location_sharing
      and l.updated_at between dispatch_at - interval '10 minutes' and dispatch_at
      and not exists (select 1 from nexroad_private.suspended_accounts x where x.user_id = p.id)
      and not exists (
        select 1 from public.service_requests active where active.assigned_technician_id = p.id
          and active.request_status in ('accepted', 'technician_arriving', 'in_progress')
      )
      and not exists (select 1 from public.request_offers o where o.request_id = booking.id and o.technician_id = p.id)
  )
  insert into public.request_offers(request_id, technician_id, estimated_distance_km, offered_at, expires_at)
    select booking.id, technician_id, round(distance_km::numeric, 2), dispatch_at,
      least(dispatch_at + interval '90 seconds', deadline)
    from candidates where distance_km <= radius_km
    order by distance_km, technician_id
    limit 5
    on conflict (request_id, technician_id) do nothing;

  next_status := case when found then 'matching' else 'requested' end;
  update public.service_requests set request_status = next_status where id = booking.id;
  return next_status;
end;
$$;

create function nexroad_private.dispatch_new_booking()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.request_status = 'requested' then
    perform nexroad_private.dispatch_booking(new.id);
  end if;
  return new;
end;
$$;

-- This trigger runs after initial activity is recorded.
create trigger zz_dispatch_new_booking after insert on public.service_requests
  for each row execute function nexroad_private.dispatch_new_booking();

create function nexroad_private.process_matching_queue()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  booking_id uuid;
  handled integer := 0;
begin
  for booking_id in
    select r.id from public.service_requests r
    where r.request_status in ('requested', 'matching')
      and (r.requested_at <= now() - interval '15 minutes' or not exists (
        select 1 from public.request_offers o where o.request_id = r.id
          and o.offer_status = 'offered' and o.expires_at > now()
      ))
    order by r.updated_at, r.id limit 100 for no key update of r skip locked
  loop
    perform nexroad_private.dispatch_booking(booking_id);
    handled := handled + 1;
  end loop;
  return handled;
end;
$$;

create function nexroad_private.retry_customer_matching(p_request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  booking public.service_requests%rowtype;
begin
  if not nexroad_private.account_access_allowed() then return null; end if;
  select * into booking from public.service_requests
    where id = p_request_id and customer_id = auth.uid() for no key update;
  if not found then return null; end if;
  if booking.updated_at > clock_timestamp() - interval '10 seconds' then
    return booking.request_status;
  end if;
  return nexroad_private.dispatch_booking(booking.id);
end;
$$;

create function nexroad_private.technician_matching_offers()
returns table(id uuid, service text, estimated_distance_km numeric, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select o.id, c.name, o.estimated_distance_km, o.expires_at
  from public.request_offers o
  join public.service_requests r on r.id = o.request_id and r.request_status = 'matching'
  join public.service_categories c on c.id = r.category_id and c.is_active
  where o.technician_id = auth.uid() and o.offer_status = 'offered' and o.expires_at > now()
    and nexroad_private.is_approved_technician(auth.uid())
  order by o.expires_at, o.id;
$$;

create function public.retry_customer_matching(p_request_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select nexroad_private.retry_customer_matching(p_request_id); $$;

create function public.technician_matching_offers()
returns table(id uuid, service text, estimated_distance_km numeric, expires_at timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from nexroad_private.technician_matching_offers(); $$;

revoke all on function nexroad_private.dispatch_booking(uuid), nexroad_private.dispatch_new_booking(),
  nexroad_private.process_matching_queue(), nexroad_private.retry_customer_matching(uuid),
  public.retry_customer_matching(uuid), nexroad_private.technician_matching_offers(), public.technician_matching_offers()
  from public, anon, authenticated;

grant execute on function nexroad_private.retry_customer_matching(uuid), public.retry_customer_matching(uuid),
  nexroad_private.technician_matching_offers(), public.technician_matching_offers() to authenticated;

-- Supabase provides pg_cron. Stock local PostgreSQL exercises the worker directly.
do $schedule$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('nexroad-process-matching', '* * * * *',
      'select nexroad_private.process_matching_queue()');
  end if;
end;
$schedule$;

commit;
