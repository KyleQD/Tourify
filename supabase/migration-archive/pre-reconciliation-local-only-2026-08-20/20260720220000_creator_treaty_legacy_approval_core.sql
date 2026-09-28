-- Phase 19 S0–S2: approval packages, legacy cycles, custody reviews.
-- ADR P19-001: creator_treaty_legacy_* avoids Phase 14–18 collisions.

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

create table if not exists public.future_phase19_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'private_entity',
  jurisdiction text,
  dual_control boolean not null default false,
  phase18_proofs_complete boolean not null default false,
  century_scale_strategy_approved boolean not null default false,
  successor_custody_verified boolean not null default false,
  cultural_governance_approved boolean not null default false,
  privacy_archival_analysis_complete boolean not null default false,
  open_specs_published boolean not null default false,
  independent_archives_count integer not null default 0,
  sustainable_funding_verified boolean not null default false,
  disaster_recovery_passed boolean not null default false,
  provider_independence_verified boolean not null default false,
  public_legitimacy_approved boolean not null default false,
  sunset_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  source_manifest_id uuid,
  actor_authority_id uuid,
  idempotency_key text unique,
  evidence_manifest jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_legacy_cycles (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase19_approval_packages(id) on delete set null,
  public_name text not null,
  legacy_state text not null default 'draft' check (legacy_state in (
    'draft', 'proposed', 'under_review', 'approved', 'effective',
    'suspended', 'terminated', 'rejected', 'archived'
  )),
  production_authority boolean not null default false,
  claims_perpetuity boolean not null default false,
  claims_future_person_representation boolean not null default false,
  claims_universal_identity boolean not null default false,
  blocks_local_exit boolean not null default false,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  jurisdiction text,
  effective_at timestamptz,
  expires_at timestamptz,
  source_manifest_id uuid,
  actor_authority_id uuid,
  idempotency_key text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_legacy_custody_reviews (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  custodian_ref text not null,
  status text not null default 'pending' check (status in (
    'pending', 'valid', 'expired', 'revoked', 'suspended', 'denied'
  )),
  independent_archive boolean not null default false,
  local_exit_preserved boolean not null default true,
  scope jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_treaty_legacy_readiness_enabled', 'Treaty legacy readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_treaty_legacy_century_scale_strategy_enabled', 'Treaty legacy century-scale strategy', 'Preservation strategy stubs.', false, 0),
  ('creator_treaty_legacy_successor_custody_enabled', 'Treaty legacy successor custody', 'Custody metadata stubs.', false, 0),
  ('creator_treaty_legacy_cultural_continuity_enabled', 'Treaty legacy cultural continuity', 'Cultural/linguistic stubs.', false, 0),
  ('creator_treaty_legacy_identifier_resolution_enabled', 'Treaty legacy identifier resolution', 'Long-horizon ID stubs.', false, 0),
  ('creator_treaty_legacy_protocol_resolution_enabled', 'Treaty legacy protocol resolution', 'Protocol resolution stubs.', false, 0),
  ('creator_treaty_legacy_post_dissolution_stewardship_enabled', 'Treaty legacy post-dissolution stewardship', 'Stewardship planning stubs.', false, 0),
  ('creator_treaty_legacy_sensitive_archive_ethics_enabled', 'Treaty legacy sensitive archive ethics', 'Ethics gate stubs.', false, 0),
  ('creator_treaty_legacy_open_specs_enabled', 'Treaty legacy open specs', 'Open specification stubs.', false, 0),
  ('creator_treaty_legacy_funding_continuity_enabled', 'Treaty legacy funding continuity', 'Funding stubs.', false, 0),
  ('creator_treaty_legacy_disaster_recovery_enabled', 'Treaty legacy disaster recovery', 'DR drill stubs.', false, 0),
  ('creator_treaty_legacy_provider_independence_enabled', 'Treaty legacy provider independence', 'Provider independence stubs.', false, 0),
  ('creator_treaty_legacy_public_legitimacy_enabled', 'Treaty legacy public legitimacy', 'Legitimacy stubs.', false, 0),
  ('creator_treaty_legacy_public_activation_enabled', 'Treaty legacy public activation', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_perpetual_authority_enabled', 'Treaty legacy perpetual authority', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_future_person_representation_enabled', 'Treaty legacy future-person representation', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_privacy_override_enabled', 'Treaty legacy privacy override', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_universal_identity_enabled', 'Treaty legacy universal identity', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_ownership_adjudication_enabled', 'Treaty legacy ownership adjudication', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_local_exit_block_enabled', 'Treaty legacy local exit block', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_sensitive_archive_public_dump_enabled', 'Treaty legacy sensitive archive public dump', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_century_scale_launch_enabled', 'Treaty legacy century-scale launch', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_legacy_phase20_handoff_enabled', 'Treaty legacy Phase 20 handoff', 'HARD-DISABLED feature ship.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase19_approval_packages enable row level security;
alter table public.creator_treaty_legacy_cycles enable row level security;
alter table public.creator_treaty_legacy_custody_reviews enable row level security;

revoke all on
  public.future_phase19_approval_packages,
  public.creator_treaty_legacy_cycles,
  public.creator_treaty_legacy_custody_reviews
from anon, authenticated;

grant select on public.future_phase19_approval_packages to authenticated;
grant select on public.creator_treaty_legacy_cycles to authenticated;
grant select on public.creator_treaty_legacy_custody_reviews to authenticated;

grant all on
  public.future_phase19_approval_packages,
  public.creator_treaty_legacy_cycles,
  public.creator_treaty_legacy_custody_reviews
to service_role;

drop policy if exists p19_packages_read on public.future_phase19_approval_packages;
create policy p19_packages_read on public.future_phase19_approval_packages for select to authenticated using (true);
drop policy if exists p19_cycles_read on public.creator_treaty_legacy_cycles;
create policy p19_cycles_read on public.creator_treaty_legacy_cycles for select to authenticated using (true);
drop policy if exists p19_custody_read on public.creator_treaty_legacy_custody_reviews;
create policy p19_custody_read on public.creator_treaty_legacy_custody_reviews for select to authenticated using (true);

drop policy if exists p19_packages_service on public.future_phase19_approval_packages;
create policy p19_packages_service on public.future_phase19_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p19_cycles_service on public.creator_treaty_legacy_cycles;
create policy p19_cycles_service on public.creator_treaty_legacy_cycles for all to service_role using (true) with check (true);
drop policy if exists p19_custody_service on public.creator_treaty_legacy_custody_reviews;
create policy p19_custody_service on public.creator_treaty_legacy_custody_reviews for all to service_role using (true) with check (true);

comment on table public.future_phase19_approval_packages is 'Phase 19 durable approval packages; Phase 18 flags never authorize legacy launch.';

commit;
