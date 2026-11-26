begin;

create function nexroad_private.can_receive_live_topic(p_topic text)
returns boolean language sql stable security definer set search_path=''
as $$
  select nexroad_private.account_access_allowed() and (
    p_topic = 'nexroad:user:' || auth.uid()::text
    or (p_topic='nexroad:admin' and exists (
      select 1 from public.user_profiles p where p.id=auth.uid() and p.role='admin'
    ))
  );
$$;
revoke all on function nexroad_private.can_receive_live_topic(text) from public,anon,authenticated;
grant execute on function nexroad_private.can_receive_live_topic(text) to authenticated;

-- Authorize only the exact private Broadcast topic being joined. The restrictive
-- rule also prevents an unrelated permissive Realtime rule from widening access.
create policy "NexRoad receive private broadcasts" on realtime.messages
for select to authenticated using (
  extension='broadcast' and topic=(select realtime.topic())
  and (select nexroad_private.can_receive_live_topic(realtime.topic()))
);
create policy "NexRoad isolate private topics" on realtime.messages
as restrictive for select to authenticated using (
  topic not like 'nexroad:%' or (
    extension='broadcast' and topic=(select realtime.topic())
    and (select nexroad_private.can_receive_live_topic(realtime.topic()))
  )
);
create policy "NexRoad denies anonymous private topic reads" on realtime.messages
as restrictive for select to anon using (topic not like 'nexroad:%');
create policy "NexRoad only database publishes" on realtime.messages
as restrictive for insert to authenticated,anon with check (topic not like 'nexroad:%');

-- Messages carry invalidation hints only. The subscribed browser reads records
-- through the existing role-checked database APIs.
create function nexroad_private.emit_live_update(p_user uuid,p_scope text)
returns void language sql security definer set search_path=''
as $$
  select realtime.send(jsonb_build_object('scope',p_scope),'changed',
    case when p_user is null then 'nexroad:admin' else 'nexroad:user:' || p_user::text end,true);
$$;
revoke all on function nexroad_private.emit_live_update(uuid,text) from public,anon,authenticated;

create function nexroad_private.broadcast_booking_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  customer uuid;
  technician uuid;
begin
  if tg_table_name='service_requests' then
    if tg_op='UPDATE' and old.request_status is not distinct from new.request_status
      and old.assigned_technician_id is not distinct from new.assigned_technician_id
      and old.payment_status is not distinct from new.payment_status then return null; end if;
    customer := new.customer_id;
    technician := new.assigned_technician_id;
    if tg_op='UPDATE' and old.assigned_technician_id is not null
      and old.assigned_technician_id is distinct from technician then
      perform nexroad_private.emit_live_update(old.assigned_technician_id,'booking');
    end if;
  else
    select r.customer_id,r.assigned_technician_id into customer,technician
      from public.service_requests r where r.id=new.request_id;
  end if;
  if customer is not null then perform nexroad_private.emit_live_update(customer,'booking'); end if;
  if technician is not null and technician is distinct from customer then
    perform nexroad_private.emit_live_update(technician,'booking');
  end if;
  perform nexroad_private.emit_live_update(null,'booking');
  return null;
end;
$$;

create function nexroad_private.broadcast_offer_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='UPDATE' and old.offer_status is not distinct from new.offer_status then return null; end if;
  perform nexroad_private.emit_live_update(new.technician_id,'offer');
  return null;
end;
$$;

create function nexroad_private.broadcast_location_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare owner_id uuid;
begin
  if tg_table_name='technician_availability' then
    if tg_op='UPDATE' and old.is_online is not distinct from new.is_online
      and old.location_sharing is not distinct from new.location_sharing then return null; end if;
  elsif not exists(select 1 from public.technician_availability a where a.technician_id=new.technician_id
    and a.is_online and a.location_sharing) then return null;
  end if;
  for owner_id in select distinct r.customer_id from public.service_requests r
    where r.assigned_technician_id=new.technician_id
      and r.request_status in ('accepted','technician_arriving','in_progress')
  loop
    perform nexroad_private.emit_live_update(owner_id,'location');
  end loop;
  perform nexroad_private.emit_live_update(null,'location');
  return null;
end;
$$;

create function nexroad_private.broadcast_admin_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform nexroad_private.emit_live_update(null,'admin');
  return null;
end;
$$;

revoke all on function nexroad_private.broadcast_booking_change(),nexroad_private.broadcast_offer_change(),
  nexroad_private.broadcast_location_change(),nexroad_private.broadcast_admin_change()
  from public,anon,authenticated;

create trigger broadcast_request_change after insert or update of request_status,assigned_technician_id,payment_status
  on public.service_requests for each row execute function nexroad_private.broadcast_booking_change();
create trigger broadcast_service_workflow_change after insert or update
  on public.booking_service_workflow for each row execute function nexroad_private.broadcast_booking_change();
create trigger broadcast_request_offer_change after insert or update of offer_status
  on public.request_offers for each row execute function nexroad_private.broadcast_offer_change();
create trigger broadcast_technician_location_change after insert or update
  on public.technician_locations for each row execute function nexroad_private.broadcast_location_change();
create trigger broadcast_technician_sharing_change after insert or update of is_online,location_sharing
  on public.technician_availability for each row execute function nexroad_private.broadcast_location_change();
create trigger broadcast_admin_activity after insert on nexroad_private.admin_activity
  for each row execute function nexroad_private.broadcast_admin_change();
create trigger broadcast_admin_complaint after insert on nexroad_private.customer_complaints
  for each row execute function nexroad_private.broadcast_admin_change();
create trigger broadcast_admin_application after insert on public.technician_applications
  for each row execute function nexroad_private.broadcast_admin_change();

create function nexroad_private.customer_booking_location(p_request_id uuid)
returns table(latitude double precision,longitude double precision,updated_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select l.latitude,l.longitude,l.updated_at
  from public.service_requests r
  join public.technician_locations l on l.technician_id=r.assigned_technician_id
  join public.technician_availability a on a.technician_id=l.technician_id
  where r.id=p_request_id and r.customer_id=auth.uid()
    and nexroad_private.account_access_allowed()
    and r.request_status in ('accepted','technician_arriving','in_progress')
    and a.is_online and a.location_sharing
    and nexroad_private.is_approved_technician(r.assigned_technician_id)
    and l.updated_at between now()-interval '10 minutes' and now();
$$;

create function nexroad_private.update_shared_technician_location(p_latitude double precision,p_longitude double precision)
returns text language plpgsql security definer set search_path=''
as $$
declare technician uuid := auth.uid();
begin
  if not nexroad_private.is_approved_technician(technician) or not coalesce(
    p_latitude between -90 and 90 and p_longitude between -180 and 180,false
  ) then return 'inactive'; end if;

  -- One lock serializes background fixes with explicit stop and offline actions.
  perform 1 from public.technician_availability a where a.technician_id=technician
    and a.is_online and a.location_sharing for no key update;
  if not found then return 'inactive'; end if;
  if exists(select 1 from public.technician_locations l where l.technician_id=technician
    and l.updated_at > clock_timestamp()-interval '10 seconds') then return 'throttled'; end if;

  insert into public.technician_locations(technician_id,latitude,longitude,captured_at)
  values(technician,p_latitude,p_longitude,clock_timestamp())
  on conflict(technician_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,
    captured_at=excluded.captured_at,accuracy_m=null,heading=null,speed_mps=null;
  return 'updated';
end;
$$;

-- Keep location writes on the serialized, throttled RPC path.
create policy "Administrator only direct location inserts" on public.technician_locations
  as restrictive for insert to authenticated with check (
    exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='admin')
  );
create policy "Administrator only direct location updates" on public.technician_locations
  as restrictive for update to authenticated
  using (exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='admin'))
  with check (exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='admin'));

create policy "Administrator only direct location deletes" on public.technician_locations
  as restrictive for delete to authenticated
  using (exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='admin'));

create or replace function nexroad_private.share_technician_location(p_latitude double precision,p_longitude double precision)
returns boolean language plpgsql security definer set search_path=''
as $$
declare technician uuid := auth.uid();
begin
  if not nexroad_private.is_approved_technician(technician) then
    raise exception using errcode='42501',message='Approved technician required';
  end if;
  if not coalesce(p_latitude between -90 and 90 and p_longitude between -180 and 180,false) then return false; end if;

  update public.technician_availability set location_sharing=true where technician_id=technician and is_online;
  if not found then return false; end if;
  return nexroad_private.update_shared_technician_location(p_latitude,p_longitude) in ('updated','throttled');
end;
$$;

create function public.customer_booking_location(p_request_id uuid)
returns table(latitude double precision,longitude double precision,updated_at timestamptz)
language sql stable security invoker set search_path=''
as $$ select * from nexroad_private.customer_booking_location(p_request_id); $$;
create function public.update_shared_technician_location(p_latitude double precision,p_longitude double precision)
returns text language sql security invoker set search_path=''
as $$ select nexroad_private.update_shared_technician_location(p_latitude,p_longitude); $$;

revoke all on function nexroad_private.customer_booking_location(uuid),public.customer_booking_location(uuid),
  nexroad_private.update_shared_technician_location(double precision,double precision),
  public.update_shared_technician_location(double precision,double precision) from public,anon,authenticated;
grant execute on function nexroad_private.customer_booking_location(uuid),public.customer_booking_location(uuid),
  nexroad_private.update_shared_technician_location(double precision,double precision),
  public.update_shared_technician_location(double precision,double precision) to authenticated;

commit;
