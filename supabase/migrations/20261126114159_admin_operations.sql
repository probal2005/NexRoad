begin;

create table nexroad_private.suspended_accounts (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  suspended_at timestamptz not null default now()
);
create table nexroad_private.admin_activity (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);
create table nexroad_private.service_price_defaults (
  category_id uuid primary key references public.service_categories(id) on delete cascade,
  base_price numeric(10,2) not null check (base_price between 0 and 99999999.99),
  service_charge numeric(10,2) not null check (service_charge between 0 and 99999999.99),
  per_km_charge numeric(10,2) not null check (per_km_charge between 0 and 99999999.99)
);
create table nexroad_private.platform_settings (
  singleton boolean primary key default true check (singleton),
  support_email text check (char_length(support_email) <= 254),
  matching_radius_km integer not null default 15 check (matching_radius_km between 1 and 100)
);
insert into nexroad_private.platform_settings default values;

create table nexroad_private.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.user_profiles(id) on delete cascade,
  request_id uuid references public.service_requests(id) on delete set null,
  message text not null check (char_length(btrim(message)) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create function nexroad_private.account_access_allowed()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and not exists (
    select 1 from nexroad_private.suspended_accounts where user_id = auth.uid()
  );
$$;
revoke all on function nexroad_private.account_access_allowed() from public, anon, authenticated;
grant execute on function nexroad_private.account_access_allowed() to authenticated;

create function public.account_access_allowed()
returns boolean language sql stable security invoker set search_path = ''
as $$ select nexroad_private.account_access_allowed(); $$;
revoke all on function public.account_access_allowed() from public, anon, authenticated;
grant execute on function public.account_access_allowed() to authenticated;

-- Restrictive policies compose with the existing ownership and role policies.
-- Own profile read access remains available to explain suspension in the UI.
do $$
declare
  relation text;
begin
  foreach relation in array array[
    'service_categories', 'vehicles', 'technician_services', 'technician_availability',
    'technician_locations', 'service_requests', 'request_offers', 'request_activity_history',
    'technician_applications', 'customer_request_feedback'
  ] loop
    execute format(
      'create policy "Active account required" on public.%I as restrictive for all to authenticated using ((select nexroad_private.account_access_allowed())) with check ((select nexroad_private.account_access_allowed()))',
      relation
    );
  end loop;
end;
$$;
create policy "Active account required to edit profile" on public.user_profiles
  as restrictive for update to authenticated
  using ((select nexroad_private.account_access_allowed()))
  with check ((select nexroad_private.account_access_allowed()));

-- Serialize customer inserts with suspension, including requests that passed RLS
-- before an administrator acquired the account lock.
create function nexroad_private.guard_customer_request_submission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.customer_id = auth.uid() then
    perform 1 from public.user_profiles where id=new.customer_id for share;
    if not nexroad_private.account_access_allowed() then
      raise exception using errcode='42501', message='Customer account is suspended';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function nexroad_private.guard_customer_request_submission() from public, anon, authenticated;
create trigger guard_customer_request_submission before insert on public.service_requests
  for each row execute function nexroad_private.guard_customer_request_submission();

create or replace function nexroad_private.is_approved_technician(p_technician_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select nexroad_private.account_access_allowed() and exists (
    select 1 from public.user_profiles p
    join public.technician_applications a on a.user_id = p.id
    where p.id = p_technician_id and p.role = 'technician' and a.status = 'approved'
      and not exists (select 1 from nexroad_private.suspended_accounts s where s.user_id = p.id)
  );
$$;

create or replace function public.cancel_customer_request(p_request_id uuid)
returns boolean language sql security invoker set search_path = ''
as $$
  select case when nexroad_private.account_access_allowed()
    then nexroad_private.cancel_customer_request(p_request_id) else false end;
$$;
create or replace function public.customer_request_technician_name(p_request_id uuid)
returns table(display_name text) language sql stable security invoker set search_path = ''
as $$
  select * from nexroad_private.customer_request_technician_name(p_request_id)
  where nexroad_private.account_access_allowed();
$$;

create function nexroad_private.require_admin()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;
end;
$$;
revoke all on function nexroad_private.require_admin() from public, anon, authenticated;

create function nexroad_private.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform nexroad_private.require_admin();
  return jsonb_build_object(
    'accounts', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select p.id, p.full_name, u.email, p.role, s.user_id is not null as suspended,
        a.status as application_status, a.application_note
      from public.user_profiles p left join auth.users u on u.id=p.id
      left join public.technician_applications a on a.user_id=p.id
      left join nexroad_private.suspended_accounts s on s.user_id=p.id
      order by (a.status = 'pending') desc nulls last, p.created_at desc, p.id limit 100
    ) t),
    'categories', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select c.id,c.name,c.is_active,s.base_price,s.service_charge,s.per_km_charge
      from public.service_categories c left join nexroad_private.service_price_defaults s on c.id=s.category_id
      order by c.name
    ) t),
    'bookings', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select r.id, r.request_status, r.payment_status, r.payment_method, r.requested_at, c.name as service
      from public.service_requests r join public.service_categories c on c.id=r.category_id
      order by r.requested_at desc, r.id limit 50
    ) t),
    'locations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select p.id,p.full_name,l.latitude,l.longitude,l.updated_at
      from public.technician_locations l join public.technician_availability av on l.technician_id=av.technician_id
      join public.user_profiles p on p.id=l.technician_id
      where av.is_online and av.location_sharing and l.updated_at >= now() - interval '10 minutes'
        and nexroad_private.is_approved_technician(p.id)
      order by l.updated_at desc, p.id limit 100
    ) t),
    'complaints', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select c.id,c.request_id,c.message,c.status,c.created_at
      from nexroad_private.customer_complaints c order by (c.status='open') desc,c.created_at desc,c.id limit 50
    ) t),
    'audit', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from (
      select id,actor_id,action,target_id,created_at from nexroad_private.admin_activity order by id desc limit 50
    ) t),
    'settings', (select jsonb_build_object('support_email',support_email,'matching_radius_km',matching_radius_km)
      from nexroad_private.platform_settings where singleton),
    'statistics', jsonb_build_object(
      'customers', (select count(*) from public.user_profiles where role='user'),
      'technicians', (select count(*) from public.user_profiles where role='technician'),
      'pending_applications', (select count(*) from public.technician_applications where status='pending'),
      'bookings', (select count(*) from public.service_requests),
      'request_statuses', (select coalesce(jsonb_object_agg(request_status,n), '{}')
        from (select request_status,count(*) n from public.service_requests group by request_status) q),
      'payment_statuses', (select coalesce(jsonb_object_agg(payment_status,n), '{}')
        from (select payment_status,count(*) n from public.service_requests group by payment_status) q)
    )
  );
end;
$$;

create function nexroad_private.admin_update(p_action text, p_target uuid, p_values jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_role text;
  v_review text;
  v_email text;
begin
  perform nexroad_private.require_admin();
  case p_action
    when 'approve_application', 'reject_application' then
      select p.role into v_role from public.user_profiles p where p.id=p_target for no key update;
      if v_role is distinct from 'user' or exists(select 1 from nexroad_private.suspended_accounts where user_id=p_target) then
        return false;
      end if;
      v_review := case when p_action='approve_application' then 'approved' else 'rejected' end;
      update public.technician_applications set status=v_review,updated_at=now()
        where user_id=p_target and status='pending';
      if not found then return false; end if;
      if v_review='approved' then
        update public.user_profiles set role='technician' where id=p_target;
      end if;
    when 'suspend_account', 'reactivate_account' then
      select p.role into v_role from public.user_profiles p where p.id=p_target for no key update;
      if v_role is null or v_role='admin' then return false; end if;
      if p_action='suspend_account' then
        perform 1 from public.technician_availability where technician_id=p_target for no key update;
        if exists (select 1 from public.service_requests
          where ((customer_id=p_target and request_status in ('requested','matching'))
            or ((customer_id=p_target or assigned_technician_id=p_target)
              and request_status in ('accepted','technician_arriving','in_progress')))) then
          return false;
        end if;
        insert into nexroad_private.suspended_accounts(user_id) values(p_target) on conflict do nothing;
        if not found then return false; end if;
        update public.technician_availability set is_online=false,accepting_requests=false,location_sharing=false
          where technician_id=p_target;
      else
        delete from nexroad_private.suspended_accounts where user_id=p_target;
        if not found then return false; end if;
      end if;
    when 'update_category' then
      update public.service_categories set name=btrim(p_values->>'name'),is_active=(p_values->>'is_active')::boolean
        where id=p_target and char_length(btrim(p_values->>'name')) between 1 and 80
          and jsonb_typeof(p_values->'is_active')='boolean';
      if not found then return false; end if;
    when 'update_price' then
      insert into nexroad_private.service_price_defaults(category_id,base_price,service_charge,per_km_charge)
      values(p_target,(p_values->>'base_price')::numeric,(p_values->>'service_charge')::numeric,(p_values->>'per_km_charge')::numeric)
      on conflict(category_id) do update set base_price=excluded.base_price,
        service_charge=excluded.service_charge,per_km_charge=excluded.per_km_charge;
    when 'resolve_complaint', 'reopen_complaint' then
      update nexroad_private.customer_complaints
      set status=case when p_action='resolve_complaint' then 'resolved' else 'open' end
      where id=p_target and status = case when p_action='resolve_complaint' then 'open' else 'resolved' end;
      if not found then return false; end if;
    when 'update_settings' then
      v_email := nullif(btrim(p_values->>'support_email'),'');
      if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
      update nexroad_private.platform_settings
      set support_email=v_email,matching_radius_km=(p_values->>'matching_radius_km')::integer where singleton;
    else
      return false;
  end case;
  insert into nexroad_private.admin_activity(actor_id,action,target_id) values(auth.uid(),p_action,p_target);
  return true;
end;
$$;

create function nexroad_private.submit_customer_complaint(p_request_id uuid, p_message text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not nexroad_private.account_access_allowed() or not exists (
    select 1 from public.user_profiles where id=auth.uid() and role='user'
  ) then
    raise exception using errcode='42501',message='Customer access required';
  end if;
  if not exists (select 1 from public.service_requests where id=p_request_id and customer_id=auth.uid())
    or not coalesce(char_length(btrim(p_message)) between 10 and 1000,false) then
    return false;
  end if;
  insert into nexroad_private.customer_complaints(customer_id,request_id,message)
  values(auth.uid(),p_request_id,btrim(p_message));
  return true;
end;
$$;

create function public.admin_overview()
returns jsonb language sql stable security invoker set search_path=''
as $$ select nexroad_private.admin_overview(); $$;
create function public.admin_update(p_action text,p_target uuid,p_values jsonb)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.admin_update(p_action,p_target,p_values); $$;
create function public.submit_customer_complaint(p_request_id uuid,p_message text)
returns boolean language sql security invoker set search_path=''
as $$ select nexroad_private.submit_customer_complaint(p_request_id,p_message); $$;

revoke all on function nexroad_private.admin_overview(),public.admin_overview(),
  nexroad_private.admin_update(text,uuid,jsonb),public.admin_update(text,uuid,jsonb),
  nexroad_private.submit_customer_complaint(uuid,text),public.submit_customer_complaint(uuid,text)
  from public,anon,authenticated;
grant execute on function nexroad_private.admin_overview(),public.admin_overview(),
  nexroad_private.admin_update(text,uuid,jsonb),public.admin_update(text,uuid,jsonb),
  nexroad_private.submit_customer_complaint(uuid,text),public.submit_customer_complaint(uuid,text)
  to authenticated;

commit;
