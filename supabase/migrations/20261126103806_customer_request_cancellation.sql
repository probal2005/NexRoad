begin;

create function nexroad_private.cancel_customer_request(p_request_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_status text;
begin
  if v_customer_id is null or not exists (
    select 1 from public.user_profiles
    where id = v_customer_id and role = 'user'
  ) then
    raise exception using errcode = '42501', message = 'Customer access required';
  end if;

  -- Match the acceptance RPC's lock order by locking the request before its offers.
  select r.request_status into v_status
  from public.service_requests r
  where r.id = p_request_id and r.customer_id = v_customer_id
  for no key update;

  if not found or v_status not in ('requested', 'matching', 'cancelled') then
    return false;
  end if;

  if v_status = 'cancelled' then
    return true;
  end if;

  update public.service_requests
  set request_status = 'cancelled', cancelled_at = now()
  where id = p_request_id;

  update public.request_offers
  set offer_status = 'closed', responded_at = now()
  where request_id = p_request_id and offer_status = 'offered';

  return true;
end;
$$;

revoke all on function nexroad_private.cancel_customer_request(uuid) from public, anon, authenticated;
grant execute on function nexroad_private.cancel_customer_request(uuid) to authenticated;

create function public.cancel_customer_request(p_request_id uuid)
returns boolean
language sql security invoker set search_path = ''
as $$
  select nexroad_private.cancel_customer_request(p_request_id);
$$;

revoke all on function public.cancel_customer_request(uuid) from public, anon, authenticated;
grant execute on function public.cancel_customer_request(uuid) to authenticated;

commit;
