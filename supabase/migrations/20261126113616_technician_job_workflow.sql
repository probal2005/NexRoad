begin;

create policy "Technicians read categories for assigned jobs"
  on public.service_categories for select to authenticated using (
    exists (
      select 1 from public.service_requests r
      where r.category_id = service_categories.id
        and r.assigned_technician_id = (select auth.uid())
        and r.request_status in ('accepted', 'technician_arriving', 'in_progress')
    ) and (select nexroad_private.is_approved_technician(auth.uid()))
  );

create function nexroad_private.decline_technician_offer(p_offer_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_technician uuid := auth.uid();
  v_request uuid;
begin
  if not nexroad_private.is_approved_technician(v_technician) then
    raise exception using errcode = '42501', message = 'Approved technician required';
  end if;

  select o.request_id into v_request from public.request_offers o
    where o.id = p_offer_id and o.technician_id = v_technician;

  perform 1 from public.service_requests r
    where r.id = v_request and r.request_status = 'matching' for no key update;
  if not found then return false; end if;

  update public.request_offers
  set offer_status = 'declined', responded_at = clock_timestamp()
  where id = p_offer_id and request_id = v_request and technician_id = v_technician
    and offer_status = 'offered' and expires_at > clock_timestamp();
  return found;
end;
$$;

create function nexroad_private.advance_technician_job(
  p_request_id uuid, p_status text, p_outcome text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_technician uuid := auth.uid();
begin
  if not nexroad_private.is_approved_technician(v_technician) then
    raise exception using errcode = '42501', message = 'Approved technician required';
  end if;

  update public.service_requests r
  set request_status = p_status,
      service_outcome = case when p_status = 'completed' then p_outcome else r.service_outcome end,
      completed_at = case when p_status = 'completed' then clock_timestamp() else r.completed_at end
  from public.service_categories c
  where c.id = r.category_id and r.id = p_request_id and r.assigned_technician_id = v_technician
    and (
      (r.request_status = 'accepted' and p_status = 'technician_arriving' and p_outcome is null)
      or (r.request_status = 'technician_arriving' and p_status = 'in_progress' and p_outcome is null)
      or (r.request_status = 'in_progress' and p_status = 'completed'
        and ((c.slug = 'mechanical' and p_outcome in ('roadside_repair', 'garage_required', 'towing_required'))
          or (c.slug <> 'mechanical' and p_outcome is null)))
    );
  return found;
end;
$$;

create function nexroad_private.technician_performance()
returns table(completed_jobs bigint, rated_jobs bigint, average_rating numeric, simulated_earnings numeric)
language sql stable security definer set search_path = ''
as $$
  select count(*), count(f.rating), avg(f.rating),
    sum(s.base_price + s.service_charge + coalesce(o.estimated_distance_km, 0) * s.per_km_charge)
  from public.service_requests r
  left join public.customer_request_feedback f on f.request_id = r.id
  left join public.technician_services s on s.technician_id = r.assigned_technician_id and s.category_id = r.category_id
  left join public.request_offers o on o.request_id = r.id and o.technician_id = r.assigned_technician_id and o.offer_status = 'accepted'
  where nexroad_private.is_approved_technician(auth.uid())
    and r.assigned_technician_id = auth.uid() and r.request_status = 'completed';
$$;

create function nexroad_private.share_technician_location(p_latitude double precision, p_longitude double precision)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_technician uuid := auth.uid();
begin
  if not nexroad_private.is_approved_technician(v_technician) then
    raise exception using errcode = '42501', message = 'Approved technician required';
  end if;
  if not coalesce(p_latitude between -90 and 90 and p_longitude between -180 and 180, false) then
    return false;
  end if;

  update public.technician_availability
  set location_sharing = true where technician_id = v_technician and is_online;
  if not found then return false; end if;

  insert into public.technician_locations (technician_id, latitude, longitude, captured_at)
  values (v_technician, p_latitude, p_longitude, clock_timestamp())
  on conflict (technician_id) do update set latitude = excluded.latitude,
    longitude = excluded.longitude, captured_at = excluded.captured_at, accuracy_m = null,
    heading = null, speed_mps = null;
  return true;
end;
$$;

create function public.decline_technician_offer(p_offer_id uuid)
returns boolean language sql security invoker set search_path = ''
as $$ select nexroad_private.decline_technician_offer(p_offer_id); $$;

create function public.advance_technician_job(p_request_id uuid, p_status text, p_outcome text default null)
returns boolean language sql security invoker set search_path = ''
as $$ select nexroad_private.advance_technician_job(p_request_id, p_status, p_outcome); $$;

create function public.technician_performance()
returns table(completed_jobs bigint, rated_jobs bigint, average_rating numeric, simulated_earnings numeric)
language sql stable security invoker set search_path = ''
as $$ select * from nexroad_private.technician_performance(); $$;

create function public.share_technician_location(p_latitude double precision, p_longitude double precision)
returns boolean language sql security invoker set search_path = ''
as $$ select nexroad_private.share_technician_location(p_latitude, p_longitude); $$;

revoke all on function
  nexroad_private.decline_technician_offer(uuid), public.decline_technician_offer(uuid),
  nexroad_private.advance_technician_job(uuid, text, text), public.advance_technician_job(uuid, text, text),
  nexroad_private.technician_performance(), public.technician_performance(),
  nexroad_private.share_technician_location(double precision, double precision),
  public.share_technician_location(double precision, double precision)
  from public, anon, authenticated;
grant execute on function
  nexroad_private.decline_technician_offer(uuid), public.decline_technician_offer(uuid),
  nexroad_private.advance_technician_job(uuid, text, text), public.advance_technician_job(uuid, text, text),
  nexroad_private.technician_performance(), public.technician_performance(),
  nexroad_private.share_technician_location(double precision, double precision),
  public.share_technician_location(double precision, double precision)
  to authenticated;

commit;
