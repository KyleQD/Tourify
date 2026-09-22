-- Phase 8 S5–S6: policy sources, contract education, alerts.

begin;

create table if not exists public.music_intelligence_policy_sources (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  jurisdiction text,
  authority_level text not null default 'secondary',
  published_at timestamptz,
  effective_at timestamptz,
  retrieved_at timestamptz not null default now(),
  content_hash text not null
);

create table if not exists public.music_intelligence_policy_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.music_intelligence_policy_sources(id) on delete cascade,
  summary text not null,
  affected_domains jsonb not null default '[]'::jsonb,
  review_by timestamptz not null,
  status text not null default 'draft' check (status in (
    'draft', 'reviewed', 'published', 'stale', 'superseded'
  )),
  supersedes_id uuid references public.music_intelligence_policy_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_contract_term_observations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  agreement_version_id uuid,
  category text not null,
  normalized_value jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0,
  human_confirmed boolean not null default false,
  permitted_for_aggregate boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_education_alerts (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid references public.music_intelligence_policy_versions(id) on delete set null,
  audience_policy jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'approved', 'published', 'revoked'
  )),
  is_recommendation boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.music_intelligence_policy_sources enable row level security;
alter table public.music_intelligence_policy_versions enable row level security;
alter table public.music_intelligence_contract_term_observations enable row level security;
alter table public.music_intelligence_education_alerts enable row level security;

revoke all on
  public.music_intelligence_policy_sources,
  public.music_intelligence_policy_versions,
  public.music_intelligence_contract_term_observations,
  public.music_intelligence_education_alerts
from anon, authenticated;

grant select on public.music_intelligence_policy_sources to authenticated;
grant select on public.music_intelligence_policy_versions to authenticated;
grant select, insert, update on public.music_intelligence_contract_term_observations to authenticated;
grant select on public.music_intelligence_education_alerts to authenticated;

grant all on
  public.music_intelligence_policy_sources,
  public.music_intelligence_policy_versions,
  public.music_intelligence_contract_term_observations,
  public.music_intelligence_education_alerts
to service_role;

drop policy if exists mi_policy_sources_read on public.music_intelligence_policy_sources;
create policy mi_policy_sources_read on public.music_intelligence_policy_sources
for select to authenticated using (true);

drop policy if exists mi_policy_versions_read on public.music_intelligence_policy_versions;
create policy mi_policy_versions_read on public.music_intelligence_policy_versions
for select to authenticated using (status in ('reviewed', 'published', 'stale'));

drop policy if exists mi_contract_obs_access on public.music_intelligence_contract_term_observations;
create policy mi_contract_obs_access on public.music_intelligence_contract_term_observations
for all to authenticated using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists mi_alerts_read on public.music_intelligence_education_alerts;
create policy mi_alerts_read on public.music_intelligence_education_alerts
for select to authenticated using (status = 'published' and is_recommendation = false);

drop policy if exists mi_policy_sources_service on public.music_intelligence_policy_sources;
create policy mi_policy_sources_service on public.music_intelligence_policy_sources for all to service_role using (true) with check (true);
drop policy if exists mi_policy_versions_service on public.music_intelligence_policy_versions;
create policy mi_policy_versions_service on public.music_intelligence_policy_versions for all to service_role using (true) with check (true);
drop policy if exists mi_contract_obs_service on public.music_intelligence_contract_term_observations;
create policy mi_contract_obs_service on public.music_intelligence_contract_term_observations for all to service_role using (true) with check (true);
drop policy if exists mi_alerts_service on public.music_intelligence_education_alerts;
create policy mi_alerts_service on public.music_intelligence_education_alerts for all to service_role using (true) with check (true);

comment on table public.music_intelligence_education_alerts is 'Educational only; is_recommendation must remain false.';

commit;
