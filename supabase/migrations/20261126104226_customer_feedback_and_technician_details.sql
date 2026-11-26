begin;

create table public.customer_request_feedback (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.customer_request_feedback enable row level security;
revoke all on public.customer_request_feedback from public, anon, authenticated;
grant select on public.customer_request_feedback to authenticated;
grant insert (request_id, rating, comment) on public.customer_request_feedback to authenticated;

create policy "Customers read feedback on own requests"
  on public.customer_request_feedback for select to authenticated using (exists (
    select 1 from public.service_requests r
    where r.id = request_id and r.customer_id = (select auth.uid())
  ));

create policy "Customers review their completed assigned requests"
  on public.customer_request_feedback for insert to authenticated with check (
    exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role = 'user')
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.customer_id = (select auth.uid())
        and r.request_status = 'completed' and r.assigned_technician_id is not null
    )
  );

create function nexroad_private.customer_request_technician_name(p_request_id uuid)
returns table(display_name text)
language sql stable security definer set search_path = ''
as $$
  select nullif(btrim(p.full_name), '')
  from public.service_requests r
  join public.user_profiles p on p.id = r.assigned_technician_id
  where auth.uid() is not null and r.id = p_request_id and r.customer_id = auth.uid()
    and r.request_status in ('accepted', 'technician_arriving', 'in_progress', 'completed');
$$;

revoke all on function nexroad_private.customer_request_technician_name(uuid) from public, anon, authenticated;
grant execute on function nexroad_private.customer_request_technician_name(uuid) to authenticated;

create function public.customer_request_technician_name(p_request_id uuid)
returns table(display_name text)
language sql stable security invoker set search_path = ''
as $$
  select * from nexroad_private.customer_request_technician_name(p_request_id);
$$;

revoke all on function public.customer_request_technician_name(uuid) from public, anon, authenticated;
grant execute on function public.customer_request_technician_name(uuid) to authenticated;

commit;
