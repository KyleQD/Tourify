-- Phase 7 S0–S3: mandates, cases, registrations. Mandate-gated admin shell.

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

create table if not exists public.music_rights_admin_mandates (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  principal_user_id uuid not null references auth.users(id) on delete cascade,
  representative_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'active', 'suspended', 'revoked', 'expired'
  )),
  scope jsonb not null default '{}'::jsonb,
  asset_ids uuid[] not null default '{}',
  right_categories text[] not null default '{}',
  territory_codes text[] not null default '{}',
  service_codes text[] not null default '{}',
  version integer not null default 1,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  written_mandate_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_rights_admin_cases (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  case_type text not null check (case_type in (
    'registration', 'correction', 'usage_claim', 'collection', 'platform_claim',
    'enforcement', 'dmca', 'dispute', 'settlement', 'reversion', 'transfer', 'other'
  )),
  mandate_id uuid references public.music_rights_admin_mandates(id) on delete set null,
  subject_type text not null check (subject_type in (
    'artist_music', 'musical_work', 'sound_recording', 'party', 'other'
  )),
  subject_id uuid not null,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft', 'needs_authority', 'ready', 'approved', 'submitted', 'accepted',
    'accepted_with_changes', 'rejected', 'conflict', 'disputed', 'suspended',
    'collected', 'closed', 'withdrawn'
  )),
  version integer not null default 1,
  workflow_module text not null default 'registration',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_rights_admin_registrations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_rights_admin_cases(id) on delete cascade,
  target_provider text not null,
  requested_action text not null default 'register_or_claim',
  status text not null default 'draft' check (status in (
    'draft', 'needs_authority', 'ready', 'approved', 'submitted', 'accepted',
    'accepted_with_changes', 'rejected', 'conflict', 'suspended', 'closed'
  )),
  idempotency_key text not null,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  response_hash text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_rights_admin_mandates_enabled', 'Rights admin mandates', 'Written administration mandates.', false, 0),
  ('music_rights_admin_cases_enabled', 'Rights admin cases', 'Administration case model.', false, 0),
  ('music_rights_admin_registration_enabled', 'Rights admin registration', 'Registry/CMO registration orchestration.', false, 0),
  ('music_rights_admin_matching_enabled', 'Rights admin matching', 'Work/recording matching and corrections.', false, 0),
  ('music_rights_admin_usage_enabled', 'Rights admin usage', 'Usage ingestion and normalization.', false, 0),
  ('music_rights_admin_claims_enabled', 'Rights admin claims', 'Royalty and platform claims.', false, 0),
  ('music_rights_admin_mechanical_enabled', 'Rights admin mechanical', 'Mechanical/publishing/MLC workflows.', false, 0),
  ('music_rights_admin_neighboring_enabled', 'Rights admin neighboring', 'Neighboring-rights collection.', false, 0),
  ('music_rights_admin_platform_claims_enabled', 'Rights admin platform claims', 'Fingerprint claim policies.', false, 0),
  ('music_rights_admin_enforcement_enabled', 'Rights admin enforcement', 'Infringement observations and triage.', false, 0),
  ('music_rights_admin_dmca_enabled', 'Rights admin DMCA', 'DMCA notice/takedown workflows.', false, 0),
  ('music_rights_admin_settlements_enabled', 'Rights admin settlements', 'Settlements and recoveries.', false, 0),
  ('music_rights_admin_partners_enabled', 'Rights admin partners', 'Partner adapters and webhooks.', false, 0),
  ('music_rights_admin_admin_ops_enabled', 'Rights admin ops', 'Ops queues and kill switches.', false, 0),
  ('music_rights_admin_automated_submission_enabled', 'Rights admin automated submission', 'Separately gated automated external submit.', false, 0),
  ('music_rights_admin_auto_takedown_enabled', 'Rights admin auto takedown', 'Must stay off without counsel; never fingerprint-alone.', false, 0),
  ('music_rights_admin_litigation_enabled', 'Rights admin litigation', 'Separately gated litigation escalation.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.music_rights_admin_mandates enable row level security;
alter table public.music_rights_admin_cases enable row level security;
alter table public.music_rights_admin_registrations enable row level security;

revoke all on
  public.music_rights_admin_mandates,
  public.music_rights_admin_cases,
  public.music_rights_admin_registrations
from anon, authenticated;

grant select, insert, update on public.music_rights_admin_mandates to authenticated;
grant select, insert, update on public.music_rights_admin_cases to authenticated;
grant select, insert, update on public.music_rights_admin_registrations to authenticated;

grant all on
  public.music_rights_admin_mandates,
  public.music_rights_admin_cases,
  public.music_rights_admin_registrations
to service_role;

drop policy if exists mra_mandates_access on public.music_rights_admin_mandates;
create policy mra_mandates_access on public.music_rights_admin_mandates
for all to authenticated using (
  principal_user_id = (select auth.uid())
  or representative_user_id = (select auth.uid())
) with check (principal_user_id = (select auth.uid()) or representative_user_id = (select auth.uid()));

drop policy if exists mra_cases_access on public.music_rights_admin_cases;
create policy mra_cases_access on public.music_rights_admin_cases
for all to authenticated using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
) with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_registrations_access on public.music_rights_admin_registrations;
create policy mra_registrations_access on public.music_rights_admin_registrations
for all to authenticated using (exists (
  select 1 from public.music_rights_admin_cases c
  where c.id = case_id and c.owner_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mra_mandates_service on public.music_rights_admin_mandates;
create policy mra_mandates_service on public.music_rights_admin_mandates for all to service_role using (true) with check (true);
drop policy if exists mra_cases_service on public.music_rights_admin_cases;
create policy mra_cases_service on public.music_rights_admin_cases for all to service_role using (true) with check (true);
drop policy if exists mra_registrations_service on public.music_rights_admin_registrations;
create policy mra_registrations_service on public.music_rights_admin_registrations for all to service_role using (true) with check (true);

comment on table public.music_rights_admin_mandates is 'Written admin mandates; Passport/license is not mandate authority.';
comment on table public.music_rights_admin_cases is 'Phase 7 cases never mutate Phase 2–6 source records.';

commit;
