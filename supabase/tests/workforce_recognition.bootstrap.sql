-- Minimal PR #15 schema contract for isolated PostgreSQL testing, not deployment.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table public.test_hiring_managers(user_id uuid, entity_type text, entity_id uuid);
create function public.can_manage_hiring(uuid,text,uuid) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.test_hiring_managers where user_id=$1 and entity_type=$2 and entity_id=$3)$$;
create function public.has_entity_permission(uuid,text,uuid,text) returns boolean language sql stable as $$select false$$;
create table public.events(id uuid primary key, promoted_event_v2_id uuid, status text);
create table public.events_v2(id uuid primary key,status text,end_at timestamptz,created_by uuid,org_id uuid,venue_id uuid);
create table public.tours(id uuid primary key,status text,end_date date,created_by uuid,org_id uuid);
create table public.tour_events(event_id uuid, tour_id uuid);
create table public.staff_members(id uuid primary key,user_id uuid,employer_entity_type text,employer_entity_id uuid,status text);
create table public.staff_shifts(id uuid primary key,staff_member_id uuid,event_id uuid,status text);
create table public.employment_assignments(id uuid primary key,user_id uuid,employer_entity_type text,employer_entity_id uuid,
 staff_member_id uuid,staff_shift_id uuid,role_key text,role_title text,role_definition_snapshot jsonb, starts_at timestamptz,ends_at timestamptz,
 status text,event_id uuid,tour_id uuid,updated_at timestamptz);
alter table public.employment_assignments enable row level security;
create policy assignments_read on public.employment_assignments for select to authenticated using(user_id=auth.uid() or public.can_manage_hiring(auth.uid(),employer_entity_type,employer_entity_id));
create policy assignments_update on public.employment_assignments for update to authenticated using(user_id=auth.uid() or public.can_manage_hiring(auth.uid(),employer_entity_type,employer_entity_id));
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant select,update on public.employment_assignments to authenticated;
