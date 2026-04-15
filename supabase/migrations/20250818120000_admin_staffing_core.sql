set client_min_messages = warning;

-- Admin Staffing, Onboarding, and Communications Core
create extension if not exists pgcrypto;

-- Ensure minimal venues_v2 exists (referenced by several tables)
create table if not exists venues_v2 (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Canonical venues (account-backed venues)
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  account_id uuid references auth.users(id) on delete set null,
  address jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Application form templates
-- ============================================================================
create table if not exists application_form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default Application Form',
  fields jsonb not null default jsonb_build_object('fields', jsonb_build_array()),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Job posting templates
-- ============================================================================
create table if not exists job_posting_templates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  department text,
  position text,
  employment_type text check (employment_type in ('full_time','part_time','contractor','volunteer')),
  location text,
  number_of_positions integer,
  salary_range jsonb,
  requirements text[],
  responsibilities text[],
  benefits text[],
  skills text[],
  experience_level text check (experience_level in ('entry','mid','senior','executive')),
  remote boolean default false,
  urgent boolean default false,
  event_id uuid references events_v2(id) on delete set null,
  event_date date,
  required_certifications text[] default '{}',
  role_type text check (role_type in ('security','bartender','street_team','production','management','other')),
  shift_duration integer,
  age_requirement integer,
  background_check_required boolean default false,
  drug_test_required boolean default false,
  uniform_provided boolean default false,
  training_provided boolean default false,
  application_form_template_id uuid references application_form_templates(id) on delete set null,
  applications_count integer not null default 0,
  views_count integer not null default 0,
  status text not null default 'published' check (status in ('published','draft','paused','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_postings_venue on job_posting_templates(venue_id, created_at desc);

-- touch updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_job_postings_touch on job_posting_templates;
create trigger trg_job_postings_touch before update on job_posting_templates for each row execute function touch_updated_at();

-- ============================================================================
-- Job applications
-- ============================================================================
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid references job_posting_templates(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  status text not null default 'pending' check (status in ('pending','in_review','accepted','rejected')),
  form_responses jsonb,
  applied_at timestamptz not null default now(),
  auto_screening_result jsonb,
  screening_issues text[],
  screening_recommendations text[],
  interview_scheduled boolean default false,
  offer_made boolean default false,
  offer_details jsonb,
  feedback text,
  rating integer,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_apps_posting on job_applications(job_posting_id, applied_at desc);
create index if not exists idx_job_apps_venue on job_applications(venue_id, status);

-- ============================================================================
-- Onboarding: candidates, workflows, steps
-- ============================================================================
create table if not exists onboarding_workflows (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  department text,
  position text,
  estimated_days integer,
  required_documents text[],
  assignees uuid[],
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_onboarding_workflows_touch on onboarding_workflows;
create trigger trg_onboarding_workflows_touch before update on onboarding_workflows for each row execute function touch_updated_at();

create table if not exists onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references onboarding_workflows(id) on delete cascade,
  title text not null,
  description text,
  step_type text not null check (step_type in ('document','training','meeting','setup','review','task','approval')),
  category text not null check (category in ('admin','training','equipment','social','performance')),
  required boolean not null default true,
  estimated_hours integer not null default 0,
  assigned_to uuid,
  depends_on text[],
  due_date_offset integer,
  instructions text,
  completion_criteria text[],
  documents text[],
  step_order integer not null default 0
);

-- If table already existed with reserved column name, fix it
do $$ begin
  if to_regclass('public.onboarding_steps') is not null then
    if exists (
      select 1 from information_schema.columns 
      where table_schema='public' and table_name='onboarding_steps' and column_name='order'
    ) then
      execute 'alter table onboarding_steps rename column "order" to step_order';
    end if;
    if not exists (
      select 1 from information_schema.columns 
      where table_schema='public' and table_name='onboarding_steps' and column_name='step_order'
    ) then
      execute 'alter table onboarding_steps add column step_order integer not null default 0';
    end if;
  end if;
end $$;

create index if not exists idx_onboarding_steps_workflow on onboarding_steps(workflow_id, step_order);

create table if not exists staff_onboarding_candidates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  application_id uuid references job_applications(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  position text,
  department text,
  status text not null default 'in_progress' check (status in ('pending','in_progress','completed','approved','rejected')),
  stage text,
  application_date timestamptz,
  employment_type text,
  onboarding_progress integer not null default 0,
  notes text,
  invitation_token text,
  onboarding_responses jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_staff_onboarding_candidates_touch on staff_onboarding_candidates;
create trigger trg_staff_onboarding_candidates_touch before update on staff_onboarding_candidates for each row execute function touch_updated_at();

create index if not exists idx_candidates_venue on staff_onboarding_candidates(venue_id, status);

-- ============================================================================
-- Staff members, shifts, zones, performance
-- ============================================================================
create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  role text,
  department text,
  employment_type text,
  status text not null default 'active' check (status in ('active','on_leave','terminated')),
  hire_date timestamptz,
  permissions jsonb not null default '{}',
  hourly_rate numeric,
  performance_rating numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_staff_members_touch on staff_members;
create trigger trg_staff_members_touch before update on staff_members for each row execute function touch_updated_at();

create index if not exists idx_staff_members_venue on staff_members(venue_id, status);

create table if not exists staff_shifts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  event_id uuid references events_v2(id) on delete set null,
  staff_member_id uuid references staff_members(id) on delete set null,
  shift_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  break_duration integer not null default 0,
  zone_assignment text,
  role_assignment text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_staff_shifts_touch on staff_shifts;
create trigger trg_staff_shifts_touch before update on staff_shifts for each row execute function touch_updated_at();

create index if not exists idx_staff_shifts_venue_date on staff_shifts(venue_id, shift_date);

create table if not exists staff_zones (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  event_id uuid references events_v2(id) on delete set null,
  zone_name text not null,
  zone_description text,
  zone_type text not null check (zone_type in ('security','bartending','crowd_control','vip','general','backstage')),
  capacity integer,
  required_staff_count integer not null,
  assigned_staff_count integer not null default 0,
  supervisor_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_staff_zones_touch on staff_zones;
create trigger trg_staff_zones_touch before update on staff_zones for each row execute function touch_updated_at();

create index if not exists idx_staff_zones_venue on staff_zones(venue_id, zone_type);

create table if not exists staff_performance_metrics (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid references staff_members(id) on delete set null,
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  event_id uuid references events_v2(id) on delete set null,
  metric_date date not null,
  attendance_rate numeric,
  performance_rating numeric,
  incidents_count integer,
  commendations_count integer,
  training_completed boolean,
  certifications_valid boolean,
  customer_feedback_score numeric,
  supervisor_rating numeric,
  notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_metrics_venue_date on staff_performance_metrics(venue_id, metric_date desc);

-- ============================================================================
-- Team communications
-- ============================================================================
create table if not exists team_communications (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  adhoc_venue_id uuid references venues_v2(id) on delete set null,
  sender_id uuid references auth.users(id) on delete set null,
  recipients uuid[] not null default '{}'::uuid[],
  subject text not null,
  content text not null,
  message_type text not null default 'announcement',
  priority text not null default 'normal',
  read_by uuid[] not null default '{}'::uuid[],
  requires_acknowledgment boolean not null default false,
  acknowledged_by uuid[] not null default '{}'::uuid[],
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_comms_venue_time on team_communications(venue_id, sent_at desc);

-- ============================================================================
-- RLS (permissive defaults for beta; endpoints enforce RBAC)
-- ============================================================================
alter table application_form_templates enable row level security;
alter table job_posting_templates enable row level security;
alter table job_applications enable row level security;
alter table onboarding_workflows enable row level security;
alter table onboarding_steps enable row level security;
alter table staff_onboarding_candidates enable row level security;
alter table staff_members enable row level security;
alter table staff_shifts enable row level security;
alter table staff_zones enable row level security;
alter table staff_performance_metrics enable row level security;
alter table team_communications enable row level security;

-- Read access for authenticated users (beta)
drop policy if exists read_all_app_forms on application_form_templates;
create policy read_all_app_forms on application_form_templates for select using (auth.role() = 'authenticated');

drop policy if exists read_all_job_postings on job_posting_templates;
create policy read_all_job_postings on job_posting_templates for select using (auth.role() = 'authenticated');

drop policy if exists read_all_job_apps on job_applications;
create policy read_all_job_apps on job_applications for select using (auth.role() = 'authenticated');

drop policy if exists read_all_workflows on onboarding_workflows;
create policy read_all_workflows on onboarding_workflows for select using (auth.role() = 'authenticated');

drop policy if exists read_all_steps on onboarding_steps;
create policy read_all_steps on onboarding_steps for select using (auth.role() = 'authenticated');

drop policy if exists read_all_candidates on staff_onboarding_candidates;
create policy read_all_candidates on staff_onboarding_candidates for select using (auth.role() = 'authenticated');

drop policy if exists read_all_staff on staff_members;
create policy read_all_staff on staff_members for select using (auth.role() = 'authenticated');

drop policy if exists read_all_shifts on staff_shifts;
create policy read_all_shifts on staff_shifts for select using (auth.role() = 'authenticated');

drop policy if exists read_all_zones on staff_zones;
create policy read_all_zones on staff_zones for select using (auth.role() = 'authenticated');

drop policy if exists read_all_metrics on staff_performance_metrics;
create policy read_all_metrics on staff_performance_metrics for select using (auth.role() = 'authenticated');

drop policy if exists read_all_comms on team_communications;
create policy read_all_comms on team_communications for select using (auth.role() = 'authenticated');

-- Write access: authenticated users; refine later with org/venue scoping
drop policy if exists insert_app_forms on application_form_templates;
create policy insert_app_forms on application_form_templates for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_job_postings on job_posting_templates;
create policy insert_job_postings on job_posting_templates for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_job_apps on job_applications;
create policy insert_job_apps on job_applications for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_workflows on onboarding_workflows;
create policy insert_workflows on onboarding_workflows for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_steps on onboarding_steps;
create policy insert_steps on onboarding_steps for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_candidates on staff_onboarding_candidates;
create policy insert_candidates on staff_onboarding_candidates for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_staff on staff_members;
create policy insert_staff on staff_members for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_shifts on staff_shifts;
create policy insert_shifts on staff_shifts for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_zones on staff_zones;
create policy insert_zones on staff_zones for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_metrics on staff_performance_metrics;
create policy insert_metrics on staff_performance_metrics for insert with check (auth.role() = 'authenticated');

drop policy if exists insert_comms on team_communications;
create policy insert_comms on team_communications for insert with check (auth.role() = 'authenticated');

-- Update access: allow if row was created by user when column exists; else any authenticated (beta)
drop policy if exists update_job_postings on job_posting_templates;
create policy update_job_postings on job_posting_templates for update using (auth.role() = 'authenticated');

drop policy if exists update_job_apps on job_applications;
create policy update_job_apps on job_applications for update using (auth.role() = 'authenticated');

drop policy if exists update_workflows on onboarding_workflows;
create policy update_workflows on onboarding_workflows for update using (auth.role() = 'authenticated');

drop policy if exists update_steps on onboarding_steps;
create policy update_steps on onboarding_steps for update using (auth.role() = 'authenticated');

drop policy if exists update_candidates on staff_onboarding_candidates;
create policy update_candidates on staff_onboarding_candidates for update using (auth.role() = 'authenticated');

drop policy if exists update_staff on staff_members;
create policy update_staff on staff_members for update using (auth.role() = 'authenticated');

drop policy if exists update_shifts on staff_shifts;
create policy update_shifts on staff_shifts for update using (auth.role() = 'authenticated');

drop policy if exists update_zones on staff_zones;
create policy update_zones on staff_zones for update using (auth.role() = 'authenticated');

drop policy if exists update_metrics on staff_performance_metrics;
create policy update_metrics on staff_performance_metrics for update using (auth.role() = 'authenticated');

drop policy if exists update_comms on team_communications;
create policy update_comms on team_communications for update using (auth.role() = 'authenticated');


