-- Phase 8 S0–S3: purposes, consents, datasets, cohorts.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_purposes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in (
    'private_diagnostics', 'aggregate_benchmarking', 'policy_research',
    'contract_education', 'negotiation_readiness', 'collective_licensing_feasibility'
  )),
  description text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose_id uuid not null references public.music_intelligence_purposes(id) on delete restrict,
  version text not null,
  data_categories jsonb not null default '[]'::jsonb,
  output_classes jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'presented', 'accepted', 'active', 'partially_withdrawn', 'expired', 'revoked'
  )),
  effective_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  purpose_id uuid not null references public.music_intelligence_purposes(id) on delete restrict,
  source_manifest jsonb not null default '{}'::jsonb,
  consent_snapshot_hash text not null,
  quality_status text not null default 'pending' check (quality_status in (
    'pending', 'passed', 'failed', 'stale'
  )),
  privacy_status text not null default 'pending' check (privacy_status in (
    'pending', 'passed', 'failed', 'needs_assessment'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_cohorts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  definition jsonb not null default '{}'::jsonb,
  threshold_policy jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'building', 'ready', 'suppressed', 'retired'
  )),
  created_at timestamptz not null default now(),
  unique (code, version)
);

insert into public.music_intelligence_purposes (code, description, is_active) values
  ('private_diagnostics', 'Private creator diagnostics', true),
  ('aggregate_benchmarking', 'Historical aggregate benchmarking', true),
  ('policy_research', 'Policy monitoring education', true),
  ('contract_education', 'Contract term education', true),
  ('negotiation_readiness', 'Negotiation readiness (no external action)', true),
  ('collective_licensing_feasibility', 'Collective licensing feasibility study only', false)
on conflict (code) do nothing;

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_rights_intelligence_consent_enabled', 'RI consent', 'Intelligence consent center.', false, 0),
  ('music_rights_intelligence_datasets_enabled', 'RI datasets', 'Dataset versioning.', false, 0),
  ('music_rights_intelligence_cohorts_enabled', 'RI cohorts', 'Cohort aggregation.', false, 0),
  ('music_rights_intelligence_metrics_enabled', 'RI metrics', 'Metric definitions and runs.', false, 0),
  ('music_rights_intelligence_benchmarks_enabled', 'RI benchmarks', 'Benchmark release workflow.', false, 0),
  ('music_rights_intelligence_education_enabled', 'RI education', 'Policy/contract education.', false, 0),
  ('music_rights_intelligence_alerts_enabled', 'RI alerts', 'Creator risk alerts.', false, 0),
  ('music_rights_intelligence_groups_enabled', 'RI groups', 'Negotiation readiness groups.', false, 0),
  ('music_rights_intelligence_clean_rooms_enabled', 'RI clean rooms', 'Research clean-room access.', false, 0),
  ('music_rights_intelligence_admin_ops_enabled', 'RI admin ops', 'Ops kill switches.', false, 0),
  ('music_rights_intelligence_external_negotiation_enabled', 'RI external negotiation', 'Separately gated; default deny.', false, 0),
  ('music_rights_intelligence_collective_licensing_enabled', 'RI collective licensing', 'Separately gated; default deny.', false, 0),
  ('music_rights_intelligence_representation_enabled', 'RI representation', 'Separately gated; default deny.', false, 0),
  ('music_rights_intelligence_benchmark_public_publish_enabled', 'RI public publish', 'Separately gated public benchmarks.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.music_intelligence_purposes enable row level security;
alter table public.music_intelligence_consents enable row level security;
alter table public.music_intelligence_dataset_versions enable row level security;
alter table public.music_intelligence_cohorts enable row level security;

revoke all on
  public.music_intelligence_purposes,
  public.music_intelligence_consents,
  public.music_intelligence_dataset_versions,
  public.music_intelligence_cohorts
from anon, authenticated;

grant select on public.music_intelligence_purposes to authenticated;
grant select, insert, update on public.music_intelligence_consents to authenticated;
grant select on public.music_intelligence_dataset_versions to authenticated;
grant select on public.music_intelligence_cohorts to authenticated;

grant all on
  public.music_intelligence_purposes,
  public.music_intelligence_consents,
  public.music_intelligence_dataset_versions,
  public.music_intelligence_cohorts
to service_role;

drop policy if exists mi_purposes_read on public.music_intelligence_purposes;
create policy mi_purposes_read on public.music_intelligence_purposes
for select to authenticated using (true);

drop policy if exists mi_consents_access on public.music_intelligence_consents;
create policy mi_consents_access on public.music_intelligence_consents
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists mi_datasets_read on public.music_intelligence_dataset_versions;
create policy mi_datasets_read on public.music_intelligence_dataset_versions
for select to authenticated using (true);

drop policy if exists mi_cohorts_read on public.music_intelligence_cohorts;
create policy mi_cohorts_read on public.music_intelligence_cohorts
for select to authenticated using (status in ('ready', 'suppressed'));

drop policy if exists mi_purposes_service on public.music_intelligence_purposes;
create policy mi_purposes_service on public.music_intelligence_purposes for all to service_role using (true) with check (true);
drop policy if exists mi_consents_service on public.music_intelligence_consents;
create policy mi_consents_service on public.music_intelligence_consents for all to service_role using (true) with check (true);
drop policy if exists mi_datasets_service on public.music_intelligence_dataset_versions;
create policy mi_datasets_service on public.music_intelligence_dataset_versions for all to service_role using (true) with check (true);
drop policy if exists mi_cohorts_service on public.music_intelligence_cohorts;
create policy mi_cohorts_service on public.music_intelligence_cohorts for all to service_role using (true) with check (true);

comment on table public.music_intelligence_consents is 'Purpose-specific consent; never grant peer access to other participants rows.';

commit;
