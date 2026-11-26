create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;
create table public.request_offers (id uuid default gen_random_uuid() not null,request_id uuid not null,technician_id uuid not null,offer_status text default 'offered'::text not null,estimated_distance_km numeric,offered_at timestamptz default now() not null,expires_at timestamptz not null,responded_at timestamptz,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.request_offers enable row level security;
grant select,insert,update,delete on public.request_offers to authenticated;
create table public.service_categories (id uuid default gen_random_uuid() not null,slug text not null,name text not null,description text,is_active bool default true not null,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.service_categories enable row level security;
grant select,insert,update,delete on public.service_categories to authenticated;
create table public.service_requests (id uuid default gen_random_uuid() not null,customer_id uuid not null,vehicle_id uuid,category_id uuid not null,service_location text not null,latitude float8 not null,longitude float8 not null,issue_description text,request_status text default 'requested'::text not null,service_outcome text,payment_method text default 'cash'::text not null,payment_status text default 'pending'::text not null,requested_at timestamptz default now() not null,accepted_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.service_requests enable row level security;
grant select,insert,update,delete on public.service_requests to authenticated;
create table public.technician_applications (user_id uuid not null,status text default 'pending'::text not null,application_note text,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.technician_applications enable row level security;
grant select,insert,update,delete on public.technician_applications to authenticated;
create table public.technician_availability (technician_id uuid not null,is_online bool default false not null,accepting_requests bool default false not null,updated_at timestamptz default now() not null,location_sharing bool default false not null);
alter table public.technician_availability enable row level security;
grant select,insert,update,delete on public.technician_availability to authenticated;
create table public.technician_locations (technician_id uuid not null,latitude float8 not null,longitude float8 not null,accuracy_m float8,heading float8,speed_mps float8,captured_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.technician_locations enable row level security;
grant select,insert,update,delete on public.technician_locations to authenticated;
create table public.technician_services (id uuid default gen_random_uuid() not null,technician_id uuid not null,category_id uuid not null,description text,base_price numeric default 0 not null,per_km_charge numeric default 0 not null,service_charge numeric default 0 not null,is_active bool default true not null,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.technician_services enable row level security;
grant select,insert,update,delete on public.technician_services to authenticated;
create table public.user_profiles (id uuid not null,full_name text default ''::text not null,phone text,avatar_url text,role text default 'user'::text not null,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.user_profiles enable row level security;
grant select,insert,update,delete on public.user_profiles to authenticated;
create table public.vehicles (id uuid default gen_random_uuid() not null,owner_id uuid not null,vehicle_type text not null,make text not null,model text not null,manufacturing_year int4,color text,registration_number text,created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
alter table public.vehicles enable row level security;
grant select,insert,update,delete on public.vehicles to authenticated;
alter table public.user_profiles add constraint user_profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'technician'::text, 'admin'::text])));
alter table public.user_profiles add constraint user_profiles_pkey PRIMARY KEY (id);
alter table public.technician_applications add constraint technician_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
alter table public.technician_applications add constraint technician_applications_pkey PRIMARY KEY (user_id);
alter table public.service_categories add constraint service_categories_slug_check CHECK ((slug = ANY (ARRAY['fuel'::text, 'mechanical'::text, 'towing'::text])));
alter table public.service_categories add constraint service_categories_pkey PRIMARY KEY (id);
alter table public.service_categories add constraint service_categories_slug_key UNIQUE (slug);
alter table public.vehicles add constraint vehicles_vehicle_type_check CHECK ((vehicle_type = ANY (ARRAY['car'::text, 'motorcycle'::text, 'other'::text])));
alter table public.vehicles add constraint vehicles_make_length CHECK (((char_length(TRIM(BOTH FROM make)) >= 1) AND (char_length(TRIM(BOTH FROM make)) <= 60)));
alter table public.vehicles add constraint vehicles_model_length CHECK (((char_length(TRIM(BOTH FROM model)) >= 1) AND (char_length(TRIM(BOTH FROM model)) <= 60)));
alter table public.vehicles add constraint vehicles_year_check CHECK (((manufacturing_year IS NULL) OR ((manufacturing_year >= 1950) AND (manufacturing_year <= 2100))));
alter table public.vehicles add constraint vehicles_pkey PRIMARY KEY (id);
alter table public.technician_services add constraint technician_services_base_price_check CHECK ((base_price >= (0)::numeric));
alter table public.technician_services add constraint technician_services_per_km_charge_check CHECK ((per_km_charge >= (0)::numeric));
alter table public.technician_services add constraint technician_services_service_charge_check CHECK ((service_charge >= (0)::numeric));
alter table public.technician_services add constraint technician_services_pkey PRIMARY KEY (id);
alter table public.technician_services add constraint technician_services_unique UNIQUE (technician_id, category_id);
alter table public.technician_availability add constraint technician_availability_pkey PRIMARY KEY (technician_id);
alter table public.technician_locations add constraint technician_locations_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)));
alter table public.technician_locations add constraint technician_locations_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)));
alter table public.technician_locations add constraint technician_locations_accuracy_m_check CHECK (((accuracy_m IS NULL) OR ((accuracy_m >= (0)::double precision) AND (accuracy_m <= (10000)::double precision))));
alter table public.technician_locations add constraint technician_locations_heading_check CHECK (((heading IS NULL) OR ((heading >= (0)::double precision) AND (heading <= (360)::double precision))));
alter table public.technician_locations add constraint technician_locations_speed_mps_check CHECK (((speed_mps IS NULL) OR (speed_mps >= (0)::double precision)));
alter table public.technician_locations add constraint technician_locations_pkey PRIMARY KEY (technician_id);
alter table public.service_requests add constraint service_requests_service_location_check CHECK (((char_length(TRIM(BOTH FROM service_location)) >= 3) AND (char_length(TRIM(BOTH FROM service_location)) <= 500)));
alter table public.service_requests add constraint service_requests_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)));
alter table public.service_requests add constraint service_requests_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)));
alter table public.service_requests add constraint service_requests_issue_description_check CHECK (((issue_description IS NULL) OR (char_length(issue_description) <= 2000)));
alter table public.service_requests add constraint service_requests_request_status_check CHECK ((request_status = ANY (ARRAY['requested'::text, 'matching'::text, 'accepted'::text, 'technician_arriving'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'expired'::text])));
alter table public.service_requests add constraint service_requests_service_outcome_check CHECK (((service_outcome IS NULL) OR (service_outcome = ANY (ARRAY['roadside_repair'::text, 'garage_required'::text, 'towing_required'::text]))));
alter table public.service_requests add constraint service_requests_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'online'::text])));
alter table public.service_requests add constraint service_requests_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])));
alter table public.service_requests add constraint service_requests_pkey PRIMARY KEY (id);
alter table public.request_offers add constraint request_offers_offer_status_check CHECK ((offer_status = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'closed'::text, 'withdrawn'::text])));
alter table public.request_offers add constraint request_offers_estimated_distance_km_check CHECK (((estimated_distance_km IS NULL) OR (estimated_distance_km >= (0)::numeric)));
alter table public.request_offers add constraint valid_offer_expiry CHECK ((expires_at > offered_at));
alter table public.request_offers add constraint request_offers_pkey PRIMARY KEY (id);
alter table public.request_offers add constraint unique_request_technician_offer UNIQUE (request_id, technician_id);
alter table public.user_profiles add constraint user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.technician_applications add constraint technician_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.technician_availability add constraint technician_availability_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.vehicles add constraint vehicles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.technician_services add constraint technician_services_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.technician_services add constraint technician_services_category_id_fkey FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT;
alter table public.technician_locations add constraint technician_locations_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.request_offers add constraint request_offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE;
alter table public.request_offers add constraint request_offers_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.service_requests add constraint service_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.service_requests add constraint service_requests_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
alter table public.service_requests add constraint service_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT;
create policy "Users can view their own profile" on public.user_profiles for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = id));
create policy "Users can update their own profile" on public.user_profiles for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy "Users can view their own technician application" on public.technician_applications for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Authenticated users can view active services" on public.service_categories for SELECT to authenticated using ((is_active = true));
create policy "Admins can manage service categories" on public.service_categories for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text)))));
create policy "Users can view their own vehicles" on public.vehicles for SELECT to authenticated using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy "Users can insert their own vehicles" on public.vehicles for INSERT to authenticated with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy "Users can update their own vehicles" on public.vehicles for UPDATE to authenticated using ((owner_id = ( SELECT auth.uid() AS uid))) with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy "Users can delete their own vehicles" on public.vehicles for DELETE to authenticated using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy "Approved technicians manage own services" on public.technician_services for ALL to authenticated using (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text)))))) with check (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text))))));
create policy "Admins manage technician services" on public.technician_services for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text)))));
create policy "Users view active technician services" on public.technician_services for SELECT to authenticated using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = technician_services.technician_id) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text))))));
create policy "Approved technicians manage own availability" on public.technician_availability for ALL to authenticated using (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text)))))) with check (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text))))));
create policy "Admins manage technician availability" on public.technician_availability for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text)))));
create policy "Approved technicians manage own location" on public.technician_locations for ALL to authenticated using (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text)))))) with check (((technician_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_profiles p
     JOIN technician_applications a ON ((a.user_id = p.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'technician'::text) AND (a.status = 'approved'::text))))));
create policy "Admins manage technician locations" on public.technician_locations for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));
create policy "Customers view own service requests" on public.service_requests for SELECT to authenticated using ((customer_id = ( SELECT auth.uid() AS uid)));
create policy "Customers create own service requests" on public.service_requests for INSERT to authenticated with check (((customer_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM service_categories c
  WHERE ((c.id = service_requests.category_id) AND (c.is_active = true)))) AND ((vehicle_id IS NULL) OR (EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = service_requests.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() AS uid)))))) AND (request_status = 'requested'::text) AND (payment_status = 'pending'::text)));
create policy "Admins manage service requests" on public.service_requests for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));
create policy "Technicians view own request offers" on public.request_offers for SELECT to authenticated using ((technician_id = ( SELECT auth.uid() AS uid)));
create policy "Admins manage request offers" on public.request_offers for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));
CREATE OR REPLACE FUNCTION public.accept_request_offer(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_technician_id UUID;
    v_request_id UUID;
    v_category_id UUID;
    v_request_status TEXT;
BEGIN
    -- Require an authenticated user
    v_technician_id := auth.uid();

    IF v_technician_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Lock the technician's offer
    SELECT o.request_id
    INTO v_request_id
    FROM public.request_offers o
    WHERE o.id = p_offer_id
      AND o.technician_id = v_technician_id
      AND o.offer_status = 'offered'
      AND o.expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer is unavailable or expired';
    END IF;

    -- Lock the service request.
    -- Concurrent acceptances for the same request must wait here.
    SELECT r.category_id, r.request_status
    INTO v_category_id, v_request_status
    FROM public.service_requests r
    WHERE r.id = v_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found';
    END IF;

    IF v_request_status <> 'matching' THEN
        RAISE EXCEPTION 'Request is no longer available';
    END IF;

    -- Verify technician approval, service eligibility,
    -- availability and fresh shared location.
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles p
        JOIN public.technician_applications a
          ON a.user_id = p.id
        JOIN public.technician_services ts
          ON ts.technician_id = p.id
        JOIN public.technician_availability av
          ON av.technician_id = p.id
        JOIN public.technician_locations loc
          ON loc.technician_id = p.id
        WHERE p.id = v_technician_id
          AND p.role = 'technician'
          AND a.status = 'approved'
          AND ts.category_id = v_category_id
          AND ts.is_active = TRUE
          AND av.is_online = TRUE
          AND av.accepting_requests = TRUE
          AND av.location_sharing = TRUE
          AND loc.updated_at >= NOW() - INTERVAL '10 minutes'
    ) THEN
        RAISE EXCEPTION 'Technician is not currently eligible';
    END IF;

    -- Claim the request
    UPDATE public.service_requests
    SET
        request_status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_request_id
      AND request_status = 'matching';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Another technician has already accepted';
    END IF;

    -- Mark this offer accepted
    UPDATE public.request_offers
    SET
        offer_status = 'accepted',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_offer_id;

    -- Close all other outstanding offers
    UPDATE public.request_offers
    SET
        offer_status = 'closed',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE request_id = v_request_id
      AND id <> p_offer_id
      AND offer_status = 'offered';

    -- Stop new incoming offers while the technician is busy
    UPDATE public.technician_availability
    SET
        accepting_requests = FALSE,
        updated_at = NOW()
    WHERE technician_id = v_technician_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'offer_id', p_offer_id,
        'status', 'accepted',
        'message', 'Request accepted successfully'
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'requested_role', '') = 'technician' then
    insert into public.technician_applications (user_id, status)
    values (new.id, 'pending')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_user_profile_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;
CREATE TRIGGER set_user_profile_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION set_user_profile_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER set_service_categories_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_technician_services_updated_at BEFORE UPDATE ON public.technician_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_technician_availability_updated_at BEFORE UPDATE ON public.technician_availability FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_technician_locations_updated_at BEFORE UPDATE ON public.technician_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_request_offers_updated_at BEFORE UPDATE ON public.request_offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
revoke update on public.user_profiles from authenticated; grant update(full_name,phone,avatar_url) on public.user_profiles to authenticated;
