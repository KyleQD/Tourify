-- Job Board core tables for publishing job postings externally and on org profiles
create extension if not exists pgcrypto;

-- Job board postings (public board)
create table if not exists job_board_postings (
  id uuid primary key default gen_random_uuid(),
  -- optional venue reference for early setup flexibility
  venue_id uuid references venues(id) on delete set null,
  organization_id uuid not null,
  organization_name text not null,
  organization_logo text,
  organization_description text,
  created_by uuid references auth.users(id) on delete set null,

  title text not null,
  description text not null,
  department text not null,
  position text not null,
  employment_type text not null check (employment_type in ('full_time','part_time','contractor','volunteer')),
  location text not null,
  number_of_positions integer not null default 1,
  salary_range jsonb,
  requirements text[] not null default '{}',
  responsibilities text[] not null default '{}',
  benefits text[] not null default '{}',
  skills text[] not null default '{}',
  experience_level text not null check (experience_level in ('entry','mid','senior','executive')),
  remote boolean not null default false,
  urgent boolean not null default false,
  required_certifications text[] not null default '{}',
  role_type text check (role_type in ('security','bartender','street_team','production','management','other')),
  background_check_required boolean not null default false,
  drug_test_required boolean not null default false,
  uniform_provided boolean not null default false,
  training_provided boolean not null default false,
  age_requirement integer,
  status text not null default 'published' check (status in ('draft','published','paused','closed')),
  applications_count integer not null default 0,
  views_count integer not null default 0,
  is_featured boolean not null default false,
  expires_at timestamptz,
  template_id uuid, -- link back to internal template when available
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_job_board_postings_touch on job_board_postings;
create trigger trg_job_board_postings_touch before update on job_board_postings for each row execute function touch_updated_at();

create index if not exists idx_job_board_postings_created on job_board_postings(created_at desc);
create index if not exists idx_job_board_postings_org on job_board_postings(organization_id, status);

-- Organization profile postings (mirrors board for org pages)
create table if not exists organization_job_postings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  organization_id uuid not null,
  organization_name text not null,
  organization_logo text,
  organization_description text,
  created_by uuid references auth.users(id) on delete set null,

  title text not null,
  description text not null,
  department text not null,
  position text not null,
  employment_type text not null check (employment_type in ('full_time','part_time','contractor','volunteer')),
  location text not null,
  number_of_positions integer not null default 1,
  salary_range jsonb,
  requirements text[] not null default '{}',
  responsibilities text[] not null default '{}',
  benefits text[] not null default '{}',
  skills text[] not null default '{}',
  experience_level text not null check (experience_level in ('entry','mid','senior','executive')),
  remote boolean not null default false,
  urgent boolean not null default false,
  required_certifications text[] not null default '{}',
  role_type text check (role_type in ('security','bartender','street_team','production','management','other')),
  background_check_required boolean not null default false,
  drug_test_required boolean not null default false,
  uniform_provided boolean not null default false,
  training_provided boolean not null default false,
  age_requirement integer,
  status text not null default 'published' check (status in ('draft','published','paused','closed')),
  applications_count integer not null default 0,
  views_count integer not null default 0,
  template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_org_job_postings_touch on organization_job_postings;
create trigger trg_org_job_postings_touch before update on organization_job_postings for each row execute function touch_updated_at();

create index if not exists idx_org_job_postings_created on organization_job_postings(created_at desc);
create index if not exists idx_org_job_postings_org on organization_job_postings(organization_id, status);

-- Enable RLS and permissive beta policies (API enforces RBAC)
alter table job_board_postings enable row level security;
alter table organization_job_postings enable row level security;

drop policy if exists read_job_board on job_board_postings;
create policy read_job_board on job_board_postings for select using (true);

drop policy if exists insert_job_board on job_board_postings;
create policy insert_job_board on job_board_postings for insert with check (auth.role() = 'authenticated');

drop policy if exists update_job_board on job_board_postings;
create policy update_job_board on job_board_postings for update using (auth.role() = 'authenticated');

drop policy if exists read_org_jobs on organization_job_postings;
create policy read_org_jobs on organization_job_postings for select using (true);

drop policy if exists insert_org_jobs on organization_job_postings;
create policy insert_org_jobs on organization_job_postings for insert with check (auth.role() = 'authenticated');

drop policy if exists update_org_jobs on organization_job_postings;
create policy update_org_jobs on organization_job_postings for update using (auth.role() = 'authenticated');


