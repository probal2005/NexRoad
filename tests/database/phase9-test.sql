insert into auth.users(id) select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,12) n;
update public.user_profiles set role='technician' where right(id::text,2)::int between 2 and 11;
insert into public.technician_applications(user_id,status)
select id,'approved' from public.user_profiles where role='technician' and right(id::text,2)::int <> 11;
insert into public.service_categories(id,slug,name)
values ('10000000-0000-0000-0000-000000000001','fuel','Fuel'),('10000000-0000-0000-0000-000000000002','towing','Tow');
insert into public.technician_services(technician_id,category_id)
select id,'10000000-0000-0000-0000-000000000001' from public.user_profiles where role='technician';
insert into public.technician_availability(technician_id,is_online,accepting_requests,location_sharing)
select id,right(id::text,2)::int <> 9,true,true from public.user_profiles where role='technician';
insert into public.technician_locations(technician_id,latitude,longitude,updated_at)
select id,30.7333 + case when right(id::text,2)::int = 8 then 1 else right(id::text,2)::int * 0.001 end,
  76.7794,case when right(id::text,2)::int = 10 then now()-interval '11 minutes' else now() end
from public.user_profiles where role='technician';

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.service_requests(id,customer_id,category_id,service_location,latitude,longitude)
select ('20000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  auth.uid(),('10000000-0000-0000-0000-'||lpad((case when n=2 then 2 else 1 end)::text,12,'0'))::uuid,
  'Chandigarh',30.7333,76.7794 from generate_series(1,4) n;
do $$ begin
  if (select request_status from public.service_requests where id='20000000-0000-0000-0000-000000000001') <> 'matching'
    or public.retry_customer_matching('20000000-0000-0000-0000-000000000002') is distinct from 'requested'
    or (select count(*) from public.request_activity_history where request_id='20000000-0000-0000-0000-000000000001') <> 2 then
    raise exception 'Initial customer status, retry, or activity failed';
  end if;
  if not public.cancel_customer_request('20000000-0000-0000-0000-000000000004') then
    raise exception 'Matching request was not cancellable';
  end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
do $$ begin
  if public.retry_customer_matching('20000000-0000-0000-0000-000000000002') is not null then
    raise exception 'Cross-account retry allowed';
  end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.technician_matching_offers()) <> 2
    or exists(select 1 from public.service_requests) then
    raise exception 'Offer list or private pickup protection failed';
  end if;
end $$;
reset role;

do $$ begin
  if (select array_agg(right(technician_id::text,2)::int order by estimated_distance_km) from public.request_offers
      where request_id='20000000-0000-0000-0000-000000000001') <> array[2,3,4,5,6]
    or exists(select 1 from public.request_offers where request_id='20000000-0000-0000-0000-000000000004' and offer_status='offered') then
    raise exception 'Ranking, filters, fan-out or cancellation cleanup failed';
  end if;
end $$;
update public.request_offers set offered_at=now()-interval '2 minutes',expires_at=now()-interval '1 second'
  where request_id='20000000-0000-0000-0000-000000000001';
update public.service_requests set requested_at=now()-interval '16 minutes'
  where id='20000000-0000-0000-0000-000000000002';
select nexroad_private.process_matching_queue();
do $$ begin
  if (select count(*) from public.request_offers where request_id='20000000-0000-0000-0000-000000000001' and offer_status='expired') <> 5
    or not exists(select 1 from public.request_offers where request_id='20000000-0000-0000-0000-000000000001'
      and technician_id='00000000-0000-0000-0000-000000000007' and offer_status='offered')
    or (select request_status from public.service_requests where id='20000000-0000-0000-0000-000000000002') <> 'expired' then
    raise exception 'Offer expiry, retry to next candidate or booking timeout failed';
  end if;
end $$;
