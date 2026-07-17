set client_min_messages = warning;

-- Hiring Hub roster-management compatibility.
--
-- This migration keeps drifted venue-era databases compatible with the current
-- employer-scoped Hiring Hub. It is intentionally additive except for replacing
-- legacy status check constraints after existing values are normalized.

begin;

alter table if exists public.staff_members
  add column if not exists onboarding_candidate_id uuid,
  add column if not exists onboarding_progress integer default 0,
  add column if not exists started_at timestamptz,
  add column if not exists last_active_at timestamptz,
  add column if not exists assigned_zone text,
  add column if not exists assigned_manager_id uuid,
  add column if not exists notes text,
  add column if not exists position text;

do $$
begin
  if to_regclass('public.staff_onboarding_candidates') is not null
     and to_regclass('public.staff_members') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'staff_members'
         and constraint_name = 'staff_members_onboarding_candidate_id_fkey'
     ) then
    alter table public.staff_members
      add constraint staff_members_onboarding_candidate_id_fkey
      foreign key (onboarding_candidate_id)
      references public.staff_onboarding_candidates(id)
      on delete set null;
  end if;

  if to_regclass('auth.users') is not null
     and to_regclass('public.staff_members') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'staff_members'
         and constraint_name = 'staff_members_assigned_manager_id_fkey'
     ) then
    alter table public.staff_members
      add constraint staff_members_assigned_manager_id_fkey
      foreign key (assigned_manager_id)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

update public.staff_members
set status = case status
  when 'on_leave' then 'inactive'
  when 'terminated' then 'offboarded'
  when 'onboarded' then 'active'
  when 'completed' then 'active'
  else status
end
where status in ('on_leave', 'terminated', 'onboarded', 'completed');

alter table if exists public.staff_members
  drop constraint if exists staff_members_status_check;

alter table if exists public.staff_members
  add constraint staff_members_status_check
  check (status in ('pending', 'active', 'inactive', 'suspended', 'offboarded'));

update public.staff_members
set
  position = coalesce(position, role),
  onboarding_progress = coalesce(onboarding_progress, 0),
  started_at = coalesce(started_at, hire_date, created_at)
where position is null
   or onboarding_progress is null
   or started_at is null;

alter table if exists public.employment_assignments
  add column if not exists staff_member_id uuid,
  add column if not exists staff_shift_id uuid,
  add column if not exists source text,
  add column if not exists position text;

do $$
begin
  if to_regclass('public.staff_members') is not null
     and to_regclass('public.employment_assignments') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'employment_assignments'
         and constraint_name = 'employment_assignments_staff_member_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_staff_member_id_fkey
      foreign key (staff_member_id)
      references public.staff_members(id)
      on delete set null;
  end if;

  if to_regclass('public.staff_shifts') is not null
     and to_regclass('public.employment_assignments') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'employment_assignments'
         and constraint_name = 'employment_assignments_staff_shift_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_staff_shift_id_fkey
      foreign key (staff_shift_id)
      references public.staff_shifts(id)
      on delete set null;
  end if;
end $$;

update public.employment_assignments
set status = case status
  when 'pending' then 'invited'
  when 'paused' then 'cancelled'
  when 'revoked' then 'cancelled'
  else status
end
where status in ('pending', 'paused', 'revoked');

alter table if exists public.employment_assignments
  drop constraint if exists employment_assignments_status_check;

alter table if exists public.employment_assignments
  add constraint employment_assignments_status_check
  check (status in ('invited', 'confirmed', 'active', 'completed', 'cancelled'));

create table if not exists public.staff_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid references public.staff_members(id) on delete cascade,
  event_id uuid,
  shift_id uuid,
  zone text,
  assigned_by uuid references auth.users(id) on delete set null,
  employer_entity_type text check (employer_entity_type in ('venue', 'organization', 'artist')),
  employer_entity_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.staff_shift_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_shift_assignments'
      and policyname = 'staff_shift_assignments_employer_manage_hiring'
  ) then
    create policy staff_shift_assignments_employer_manage_hiring
      on public.staff_shift_assignments
      for all
      to authenticated
      using (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))
      with check (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id));
  end if;
end $$;

create index if not exists idx_staff_members_employer_status
  on public.staff_members (employer_entity_type, employer_entity_id, status);

create index if not exists idx_staff_members_employer_department
  on public.staff_members (employer_entity_type, employer_entity_id, department);

create index if not exists idx_staff_members_onboarding_candidate
  on public.staff_members (onboarding_candidate_id)
  where onboarding_candidate_id is not null;

create index if not exists idx_employment_assignments_employer_user
  on public.employment_assignments (employer_entity_type, employer_entity_id, user_id);

create index if not exists idx_employment_assignments_staff_member
  on public.employment_assignments (staff_member_id)
  where staff_member_id is not null;

do $$
begin
  if to_regclass('public.staff_documents') is not null then
    create index if not exists idx_staff_documents_candidate_status
      on public.staff_documents (candidate_id, status)
      where candidate_id is not null;
  end if;
end $$;

create index if not exists idx_staff_shift_assignments_employer
  on public.staff_shift_assignments (employer_entity_type, employer_entity_id, created_at desc);

commit;
