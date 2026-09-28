-- Phase 18 S0–S3: approval packages, renewal cycles, authority revalidation.
-- ADR P18-001: creator_treaty_renewal_* avoids Phase 14–17 collisions.

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

create table if not exists public.future_phase18_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'private_entity',
  jurisdiction text,
  dual_control boolean not null default false,
  repeated_phase17_cycles integer not null default 0,
  legal_review_approved boolean not null default false,
  archive_restore_passed boolean not null default false,
  public_notice_complete boolean not null default false,
  independent_review_complete boolean not null default false,
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

create table if not exists public.creator_treaty_renewal_cycles (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase18_approval_packages(id) on delete set null,
  public_name text not null,
  renewal_state text not null default 'draft' check (renewal_state in (
    'draft', 'proposed', 'under_review', 'approved', 'effective',
    'sunset_pending', 'sunset', 'suspended', 'terminated', 'rejected', 'archived'
  )),
  production_authority boolean not null default false,
  claims_perpetuity boolean not null default false,
  claims_privilege boolean not null default false,
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

create table if not exists public.creator_treaty_renewal_authority_revalidations (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  authority_ref text not null,
  status text not null default 'pending' check (status in (
    'pending', 'valid', 'expired', 'revoked', 'suspended', 'denied'
  )),
  scope jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_treaty_renewal_readiness_enabled', 'Treaty renewal readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_treaty_renewal_repeated_cycles_enabled', 'Treaty renewal repeated cycles', 'Phase 17 cycle evidence.', false, 0),
  ('creator_treaty_renewal_legal_character_enabled', 'Treaty renewal legal character', 'Non-perpetuity controls.', false, 0),
  ('creator_treaty_renewal_future_generations_enabled', 'Treaty renewal future generations', 'FG impact assessments.', false, 0),
  ('creator_treaty_renewal_intergenerational_assembly_enabled', 'Treaty renewal intergenerational assembly', 'Advisory assembly stubs.', false, 0),
  ('creator_treaty_renewal_sunset_enabled', 'Treaty renewal sunset', 'Sunset/renewal lifecycle.', false, 0),
  ('creator_treaty_renewal_authority_revalidation_enabled', 'Treaty renewal authority revalidation', 'Authority revalidation.', false, 0),
  ('creator_treaty_renewal_succession_enabled', 'Treaty renewal succession', 'Succession stubs.', false, 0),
  ('creator_treaty_renewal_local_sovereignty_enabled', 'Treaty renewal local sovereignty', 'Local sovereignty gates.', false, 0),
  ('creator_treaty_renewal_foresight_enabled', 'Treaty renewal foresight', 'Strategic foresight stubs.', false, 0),
  ('creator_treaty_renewal_risk_register_enabled', 'Treaty renewal risk register', 'Long-horizon risks.', false, 0),
  ('creator_treaty_renewal_archives_enabled', 'Treaty renewal archives', 'Archive packages.', false, 0),
  ('creator_treaty_renewal_digital_preservation_enabled', 'Treaty renewal digital preservation', 'Preservation stubs.', false, 0),
  ('creator_treaty_renewal_evidence_replay_enabled', 'Treaty renewal evidence replay', 'Historical replay stubs.', false, 0),
  ('creator_treaty_renewal_archive_transfer_enabled', 'Treaty renewal archive transfer', 'Custody transfer stubs.', false, 0),
  ('creator_treaty_renewal_technology_migration_enabled', 'Treaty renewal technology migration', 'Tech migration stubs.', false, 0),
  ('creator_treaty_renewal_crypto_agility_enabled', 'Treaty renewal crypto agility', 'Crypto migration stubs.', false, 0),
  ('creator_treaty_renewal_identifier_migration_enabled', 'Treaty renewal identifier migration', 'Identifier migration stubs.', false, 0),
  ('creator_treaty_renewal_conference_enabled', 'Treaty renewal conference', 'HARD-DISABLED formal conference.', false, 0),
  ('creator_treaty_renewal_public_consultation_enabled', 'Treaty renewal public consultation', 'Consultation stubs.', false, 0),
  ('creator_treaty_renewal_protocol_portfolio_enabled', 'Treaty renewal protocol portfolio', 'Portfolio review stubs.', false, 0),
  ('creator_treaty_renewal_service_decommission_enabled', 'Treaty renewal service decommission', 'Decommission drills.', false, 0),
  ('creator_treaty_renewal_leadership_succession_enabled', 'Treaty renewal leadership succession', 'Leadership succession stubs.', false, 0),
  ('creator_treaty_renewal_workforce_transfer_enabled', 'Treaty renewal workforce transfer', 'Knowledge transfer stubs.', false, 0),
  ('creator_treaty_renewal_endowment_enabled', 'Treaty renewal endowment', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_renewal_anti_capture_enabled', 'Treaty renewal anti-capture', 'Anti-capture stubs.', false, 0),
  ('creator_treaty_renewal_public_service_floor_enabled', 'Treaty renewal public-service floor', 'Continuity floor stubs.', false, 0),
  ('creator_treaty_renewal_arrangements_review_enabled', 'Treaty renewal arrangements review', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_renewal_privilege_revalidation_enabled', 'Treaty renewal privilege revalidation', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_renewal_oversight_refresh_enabled', 'Treaty renewal oversight refresh', 'Oversight stubs.', false, 0),
  ('creator_treaty_renewal_outcome_evaluation_enabled', 'Treaty renewal outcome evaluation', 'Outcome stubs.', false, 0),
  ('creator_treaty_renewal_intergenerational_equity_enabled', 'Treaty renewal intergenerational equity', 'Equity analysis stubs.', false, 0),
  ('creator_treaty_renewal_archive_public_access_enabled', 'Treaty renewal archive public access', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_renewal_dissolution_enabled', 'Treaty renewal dissolution', 'HARD-DISABLED (rehearsal only via code).', false, 0),
  ('creator_treaty_renewal_public_activation_enabled', 'Treaty renewal public activation', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_renewal_phase19_handoff_enabled', 'Treaty renewal Phase 19 handoff', 'HARD-DISABLED feature ship.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase18_approval_packages enable row level security;
alter table public.creator_treaty_renewal_cycles enable row level security;
alter table public.creator_treaty_renewal_authority_revalidations enable row level security;

revoke all on
  public.future_phase18_approval_packages,
  public.creator_treaty_renewal_cycles,
  public.creator_treaty_renewal_authority_revalidations
from anon, authenticated;

grant select on public.future_phase18_approval_packages to authenticated;
grant select on public.creator_treaty_renewal_cycles to authenticated;
grant select on public.creator_treaty_renewal_authority_revalidations to authenticated;

grant all on
  public.future_phase18_approval_packages,
  public.creator_treaty_renewal_cycles,
  public.creator_treaty_renewal_authority_revalidations
to service_role;

drop policy if exists p18_packages_read on public.future_phase18_approval_packages;
create policy p18_packages_read on public.future_phase18_approval_packages for select to authenticated using (true);
drop policy if exists p18_cycles_read on public.creator_treaty_renewal_cycles;
create policy p18_cycles_read on public.creator_treaty_renewal_cycles for select to authenticated using (true);
drop policy if exists p18_authority_read on public.creator_treaty_renewal_authority_revalidations;
create policy p18_authority_read on public.creator_treaty_renewal_authority_revalidations for select to authenticated using (true);

drop policy if exists p18_packages_service on public.future_phase18_approval_packages;
create policy p18_packages_service on public.future_phase18_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p18_cycles_service on public.creator_treaty_renewal_cycles;
create policy p18_cycles_service on public.creator_treaty_renewal_cycles for all to service_role using (true) with check (true);
drop policy if exists p18_authority_service on public.creator_treaty_renewal_authority_revalidations;
create policy p18_authority_service on public.creator_treaty_renewal_authority_revalidations for all to service_role using (true) with check (true);

comment on table public.future_phase18_approval_packages is 'Phase 18 durable approval packages; Phase 17 flags never authorize renewal launch.';

commit;
