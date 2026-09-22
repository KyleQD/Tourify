-- Phase 16 S0–S2: approval packages, institutions, instruments, participants, readiness.
-- ADR P16-001: creator_interop_institution_* avoids Phase 14/15 collisions.

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

create table if not exists public.future_phase16_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'private_entity',
  jurisdiction text,
  dual_control boolean not null default false,
  legal_basis_effective boolean not null default false,
  public_notice_complete boolean not null default false,
  independent_review_complete boolean not null default false,
  sunset_at timestamptz,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  source_manifest_id uuid,
  evidence_manifest jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phase16_source_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  content_hash text not null,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.phase16_readiness_reviews (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase16_approval_packages(id) on delete set null,
  review_type text not null,
  status text not null default 'open' check (status in (
    'open', 'in_review', 'approved', 'rejected', 'blocked'
  )),
  findings jsonb not null default '{}'::jsonb,
  reviewer_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_institution_institutions (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase16_approval_packages(id) on delete set null,
  public_name text not null,
  legal_character text not null default 'private_entity',
  lifecycle_state text not null default 'draft' check (lifecycle_state in (
    'draft', 'proposed', 'approved', 'sandbox', 'effective', 'suspended', 'revoked', 'withdrawn', 'expired', 'superseded', 'rejected'
  )),
  production_authority boolean not null default false,
  claims_treaty_status boolean not null default false,
  claims_io_status boolean not null default false,
  claims_un_relationship boolean not null default false,
  claims_specialized_agency boolean not null default false,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  jurisdiction text,
  source_manifest_id uuid references public.phase16_source_manifests(id) on delete set null,
  effective_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_interop_institution_instruments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  instrument_type text not null,
  lifecycle_state text not null default 'draft' check (lifecycle_state in (
    'draft', 'proposed', 'approved', 'sandbox', 'effective', 'suspended', 'revoked', 'withdrawn', 'expired', 'superseded', 'rejected'
  )),
  authentic_languages text[] not null default '{}',
  content_hash text not null,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  source_manifest_id uuid,
  effective_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_institution_participants (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  participant_class text not null check (participant_class in (
    'state', 'international_organization', 'creator_body', 'observer', 'public_authority'
  )),
  authority_state text not null default 'draft' check (authority_state in (
    'draft', 'proposed', 'approved', 'effective', 'suspended', 'revoked', 'expired', 'rejected'
  )),
  jurisdiction text not null,
  authority_evidence_ids uuid[] not null default '{}',
  live_membership boolean not null default false,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_interop_institution_readiness_enabled', 'Interop institution readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_interop_institution_legal_character_enabled', 'Interop institution legal character', 'Legal character taxonomy.', false, 0),
  ('creator_interop_institution_constitutive_instruments_enabled', 'Interop institution instruments', 'Mock constitutive instruments.', false, 0),
  ('creator_interop_institution_state_participation_enabled', 'Interop institution state participation', 'Authority evidence sandbox.', false, 0),
  ('creator_interop_institution_io_participation_enabled', 'Interop institution IO participation', 'IO participation sandbox.', false, 0),
  ('creator_interop_institution_observer_program_enabled', 'Interop institution observer program', 'Observer stubs.', false, 0),
  ('creator_interop_institution_governance_sandbox_enabled', 'Interop institution governance sandbox', 'Governing-body simulations.', false, 0),
  ('creator_interop_institution_protocols_enabled', 'Interop institution protocols', 'Mock treaty protocols.', false, 0),
  ('creator_interop_institution_private_custodian_enabled', 'Interop institution private custodian', 'Private instrument custody.', false, 0),
  ('creator_interop_institution_formal_depositary_enabled', 'Interop institution formal depositary', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_article102_registration_enabled', 'Interop institution Article 102', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_un_relationship_enabled', 'Interop institution UN relationship', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_specialized_agency_claim_enabled', 'Interop institution specialized agency', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_relationship_agreements_enabled', 'Interop institution relationships', 'Sandbox relationship agreements.', false, 0),
  ('creator_interop_institution_public_law_services_enabled', 'Interop institution public-law services', 'Sandbox service definitions.', false, 0),
  ('creator_interop_institution_trust_registries_enabled', 'Interop institution trust registries', 'Sandbox trust registries.', false, 0),
  ('creator_interop_institution_rights_reference_enabled', 'Interop institution rights reference', 'Sandbox rights reference.', false, 0),
  ('creator_interop_institution_capacity_building_enabled', 'Interop institution capacity building', 'Sandbox capacity building.', false, 0),
  ('creator_interop_institution_global_fund_enabled', 'Interop institution global fund', 'Sandbox fund models.', false, 0),
  ('creator_interop_institution_assessed_contributions_enabled', 'Interop institution assessed contributions', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_voluntary_contributions_enabled', 'Interop institution voluntary contributions', 'Sandbox only.', false, 0),
  ('creator_interop_institution_service_fees_enabled', 'Interop institution service fees', 'Sandbox only.', false, 0),
  ('creator_interop_institution_headquarters_enabled', 'Interop institution headquarters', 'HQ readiness stubs.', false, 0),
  ('creator_interop_institution_privileges_enabled', 'Interop institution privileges', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_staff_justice_enabled', 'Interop institution staff justice', 'Sandbox only.', false, 0),
  ('creator_interop_institution_public_registry_enabled', 'Interop institution public registry', 'Sandbox projections.', false, 0),
  ('creator_interop_institution_collective_action_enabled', 'Interop institution collective action', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_global_representation_enabled', 'Interop institution global representation', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_regulatory_power_enabled', 'Interop institution regulatory power', 'HARD-DISABLED.', false, 0),
  ('creator_interop_institution_production_enabled', 'Interop institution production', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase16_approval_packages enable row level security;
alter table public.phase16_source_manifests enable row level security;
alter table public.phase16_readiness_reviews enable row level security;
alter table public.creator_interop_institution_institutions enable row level security;
alter table public.creator_interop_institution_instruments enable row level security;
alter table public.creator_interop_institution_participants enable row level security;

revoke all on
  public.future_phase16_approval_packages,
  public.phase16_source_manifests,
  public.phase16_readiness_reviews,
  public.creator_interop_institution_institutions,
  public.creator_interop_institution_instruments,
  public.creator_interop_institution_participants
from anon, authenticated;

grant select on public.future_phase16_approval_packages to authenticated;
grant select on public.phase16_source_manifests to authenticated;
grant select on public.phase16_readiness_reviews to authenticated;
grant select on public.creator_interop_institution_institutions to authenticated;
grant select on public.creator_interop_institution_instruments to authenticated;
grant select on public.creator_interop_institution_participants to authenticated;

grant all on
  public.future_phase16_approval_packages,
  public.phase16_source_manifests,
  public.phase16_readiness_reviews,
  public.creator_interop_institution_institutions,
  public.creator_interop_institution_instruments,
  public.creator_interop_institution_participants
to service_role;

drop policy if exists p16_packages_read on public.future_phase16_approval_packages;
create policy p16_packages_read on public.future_phase16_approval_packages for select to authenticated using (true);
drop policy if exists p16_manifests_read on public.phase16_source_manifests;
create policy p16_manifests_read on public.phase16_source_manifests for select to authenticated using (true);
drop policy if exists p16_reviews_read on public.phase16_readiness_reviews;
create policy p16_reviews_read on public.phase16_readiness_reviews for select to authenticated using (true);
drop policy if exists p16_institutions_read on public.creator_interop_institution_institutions;
create policy p16_institutions_read on public.creator_interop_institution_institutions for select to authenticated using (true);
drop policy if exists p16_instruments_read on public.creator_interop_institution_instruments;
create policy p16_instruments_read on public.creator_interop_institution_instruments for select to authenticated using (true);
drop policy if exists p16_participants_read on public.creator_interop_institution_participants;
create policy p16_participants_read on public.creator_interop_institution_participants for select to authenticated using (true);

drop policy if exists p16_packages_service on public.future_phase16_approval_packages;
create policy p16_packages_service on public.future_phase16_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p16_manifests_service on public.phase16_source_manifests;
create policy p16_manifests_service on public.phase16_source_manifests for all to service_role using (true) with check (true);
drop policy if exists p16_reviews_service on public.phase16_readiness_reviews;
create policy p16_reviews_service on public.phase16_readiness_reviews for all to service_role using (true) with check (true);
drop policy if exists p16_institutions_service on public.creator_interop_institution_institutions;
create policy p16_institutions_service on public.creator_interop_institution_institutions for all to service_role using (true) with check (true);
drop policy if exists p16_instruments_service on public.creator_interop_institution_instruments;
create policy p16_instruments_service on public.creator_interop_institution_instruments for all to service_role using (true) with check (true);
drop policy if exists p16_participants_service on public.creator_interop_institution_participants;
create policy p16_participants_service on public.creator_interop_institution_participants for all to service_role using (true) with check (true);

comment on table public.future_phase16_approval_packages is 'Phase 16 durable approval packages; Phase 15 flags never authorize institution launch.';

commit;
