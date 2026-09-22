-- Phase 11 S5–S6: protocol profiles, bilateral service directory, conformance runs.

begin;

create table if not exists public.creator_public_protocol_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'approved', 'deprecated', 'withdrawn'
  )),
  specification_uri text not null,
  ipr_policy_uri text,
  released_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(profile_key, version)
);

create table if not exists public.creator_public_service_directory (
  id uuid primary key default gen_random_uuid(),
  organization_identifier text not null,
  capability text not null,
  endpoint_uri text not null,
  jurisdictions text[] not null default '{}',
  status text not null default 'pending' check (status in (
    'pending', 'active', 'degraded', 'suspended', 'withdrawn'
  )),
  policy_version text not null default '1.0.0',
  health_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_conformance_runs (
  id uuid primary key default gen_random_uuid(),
  subject_identifier text not null,
  profile_id uuid not null references public.creator_public_protocol_profiles(id) on delete restrict,
  status text not null default 'queued' check (status in (
    'queued', 'running', 'passed', 'failed', 'blocked'
  )),
  evidence_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.creator_public_protocol_profiles enable row level security;
alter table public.creator_public_service_directory enable row level security;
alter table public.creator_public_conformance_runs enable row level security;

revoke all on
  public.creator_public_protocol_profiles,
  public.creator_public_service_directory,
  public.creator_public_conformance_runs
from anon, authenticated;

grant select on public.creator_public_protocol_profiles to authenticated;
grant select on public.creator_public_service_directory to authenticated;
grant select, insert on public.creator_public_conformance_runs to authenticated;

grant all on
  public.creator_public_protocol_profiles,
  public.creator_public_service_directory,
  public.creator_public_conformance_runs
to service_role;

drop policy if exists cpi_protocols_read on public.creator_public_protocol_profiles;
create policy cpi_protocols_read on public.creator_public_protocol_profiles
for select to authenticated using (true);

drop policy if exists cpi_directory_read on public.creator_public_service_directory;
create policy cpi_directory_read on public.creator_public_service_directory
for select to authenticated using (true);

drop policy if exists cpi_conformance_access on public.creator_public_conformance_runs;
create policy cpi_conformance_access on public.creator_public_conformance_runs
for select to authenticated using (true);

drop policy if exists cpi_conformance_insert on public.creator_public_conformance_runs;
create policy cpi_conformance_insert on public.creator_public_conformance_runs
for insert to authenticated with check (true);

drop policy if exists cpi_protocols_service on public.creator_public_protocol_profiles;
create policy cpi_protocols_service on public.creator_public_protocol_profiles for all to service_role using (true) with check (true);
drop policy if exists cpi_directory_service on public.creator_public_service_directory;
create policy cpi_directory_service on public.creator_public_service_directory for all to service_role using (true) with check (true);
drop policy if exists cpi_conformance_service on public.creator_public_conformance_runs;
create policy cpi_conformance_service on public.creator_public_conformance_runs for all to service_role using (true) with check (true);

comment on table public.creator_public_service_directory is 'Bilateral private discovery; not a universal marketplace or collective bargaining surface.';

commit;
