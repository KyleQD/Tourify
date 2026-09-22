-- Phase 17 S0–S2: approval packages, readiness, blockers, activation, operation cycles.
-- ADR P17-001: creator_treaty_ops_* avoids Phase 14–16 collisions.

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

create table if not exists public.future_phase17_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'private_entity',
  jurisdiction text,
  dual_control boolean not null default false,
  multi_year_evidence_verified boolean not null default false,
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

create table if not exists public.phase17_readiness_evidence (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase17_approval_packages(id) on delete set null,
  evidence_type text not null,
  content_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  simulated boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.phase17_blockers (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase17_approval_packages(id) on delete set null,
  blocker_code text not null,
  severity text not null default 'critical' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'mitigating', 'resolved', 'accepted')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.phase17_activation_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase17_approval_packages(id) on delete set null,
  status text not null default 'denied' check (status in (
    'denied', 'draft', 'approved', 'active', 'suspended', 'sunset', 'rolled_back'
  )),
  scope jsonb not null default '[]'::jsonb,
  jurisdiction jsonb not null default '[]'::jsonb,
  owner_ref text,
  expires_at timestamptz,
  rollback_ready boolean not null default false,
  decision_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_operation_cycles (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase17_approval_packages(id) on delete set null,
  public_name text not null,
  state text not null default 'draft' check (state in (
    'draft', 'planned', 'active', 'suspended', 'closed', 'terminated'
  )),
  production_authority boolean not null default false,
  claims_formal_depositary boolean not null default false,
  claims_competence_expansion boolean not null default false,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  jurisdiction text,
  source_manifest_id uuid,
  actor_authority_id uuid,
  idempotency_key text unique not null,
  effective_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_periodic_review_cycles (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  mandate_status text not null default 'draft' check (mandate_status in (
    'draft', 'approved', 'active', 'expired', 'suspended', 'revoked'
  )),
  scope jsonb not null default '{}'::jsonb,
  baseline_at timestamptz,
  review_state text not null default 'planned' check (review_state in (
    'planned', 'open', 'evidence_collection', 'deliberation', 'outcomes_adopted', 'closed', 'terminated'
  )),
  next_review_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_governing_body_sessions (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  session_type text not null default 'sandbox_simulation',
  authority_source jsonb not null default '{}'::jsonb,
  state text not null default 'draft' check (state in (
    'draft', 'scheduled', 'in_session', 'adjourned', 'closed', 'void'
  )),
  starts_at timestamptz,
  ends_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_treaty_ops_readiness_enabled', 'Treaty ops readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_treaty_ops_multi_year_evidence_enabled', 'Treaty ops multi-year evidence', 'Evidence verification stubs.', false, 0),
  ('creator_treaty_ops_legal_character_enabled', 'Treaty ops legal character', 'Legal-character controls.', false, 0),
  ('creator_treaty_ops_administration_enabled', 'Treaty ops administration', 'Administration sandbox.', false, 0),
  ('creator_treaty_ops_authority_revalidation_enabled', 'Treaty ops authority revalidation', 'Authority revalidation.', false, 0),
  ('creator_treaty_ops_governing_body_sessions_enabled', 'Treaty ops governing-body sessions', 'Session simulations.', false, 0),
  ('creator_treaty_ops_periodic_review_enabled', 'Treaty ops periodic review', 'Review cycle sandbox.', false, 0),
  ('creator_treaty_ops_review_evidence_enabled', 'Treaty ops review evidence', 'Evidence manifests.', false, 0),
  ('creator_treaty_ops_expert_evaluation_enabled', 'Treaty ops expert evaluation', 'Expert panel stubs.', false, 0),
  ('creator_treaty_ops_creator_outcomes_enabled', 'Treaty ops creator outcomes', 'Outcome evaluation stubs.', false, 0),
  ('creator_treaty_ops_implementation_reporting_enabled', 'Treaty ops implementation reporting', 'Implementation reports.', false, 0),
  ('creator_treaty_ops_compliance_review_enabled', 'Treaty ops compliance review', 'Compliance sandbox.', false, 0),
  ('creator_treaty_ops_protocol_amendment_enabled', 'Treaty ops protocol amendment', 'Amendment drills.', false, 0),
  ('creator_treaty_ops_protocol_consolidation_enabled', 'Treaty ops protocol consolidation', 'Consolidation drills.', false, 0),
  ('creator_treaty_ops_protocol_suspension_enabled', 'Treaty ops protocol suspension', 'Suspension drills.', false, 0),
  ('creator_treaty_ops_protocol_termination_enabled', 'Treaty ops protocol termination', 'Termination drills.', false, 0),
  ('creator_treaty_ops_reservations_enabled', 'Treaty ops reservations', 'Reservations sandbox.', false, 0),
  ('creator_treaty_ops_private_custody_enabled', 'Treaty ops private custody', 'Private instrument custody.', false, 0),
  ('creator_treaty_ops_formal_depositary_enabled', 'Treaty ops formal depositary', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_article102_tracking_enabled', 'Treaty ops Article 102 tracking', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_interpretive_guidance_enabled', 'Treaty ops interpretive guidance', 'Guidance stubs.', false, 0),
  ('creator_treaty_ops_institutional_reform_enabled', 'Treaty ops institutional reform', 'Reform stubs.', false, 0),
  ('creator_treaty_ops_competence_change_enabled', 'Treaty ops competence change', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_relationship_agreements_enabled', 'Treaty ops relationship agreements', 'Sandbox relationships.', false, 0),
  ('creator_treaty_ops_public_service_obligations_enabled', 'Treaty ops public-service obligations', 'Service obligation stubs.', false, 0),
  ('creator_treaty_ops_country_programs_enabled', 'Treaty ops country programs', 'Country program stubs.', false, 0),
  ('creator_treaty_ops_capacity_fund_enabled', 'Treaty ops capacity fund', 'Fund models sandbox.', false, 0),
  ('creator_treaty_ops_assessed_contributions_enabled', 'Treaty ops assessed contributions', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_privileges_enabled', 'Treaty ops privileges', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_public_registries_enabled', 'Treaty ops public registries', 'Sandbox projections.', false, 0),
  ('creator_treaty_ops_external_public_activation_enabled', 'Treaty ops external public activation', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_universal_identity_enabled', 'Treaty ops universal identity', 'HARD-DISABLED.', false, 0),
  ('creator_treaty_ops_collective_authority_enabled', 'Treaty ops collective authority', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase17_approval_packages enable row level security;
alter table public.phase17_readiness_evidence enable row level security;
alter table public.phase17_blockers enable row level security;
alter table public.phase17_activation_decisions enable row level security;
alter table public.creator_treaty_ops_operation_cycles enable row level security;
alter table public.creator_treaty_ops_periodic_review_cycles enable row level security;
alter table public.creator_treaty_ops_governing_body_sessions enable row level security;

revoke all on
  public.future_phase17_approval_packages,
  public.phase17_readiness_evidence,
  public.phase17_blockers,
  public.phase17_activation_decisions,
  public.creator_treaty_ops_operation_cycles,
  public.creator_treaty_ops_periodic_review_cycles,
  public.creator_treaty_ops_governing_body_sessions
from anon, authenticated;

grant select on public.future_phase17_approval_packages to authenticated;
grant select on public.phase17_readiness_evidence to authenticated;
grant select on public.phase17_blockers to authenticated;
grant select on public.phase17_activation_decisions to authenticated;
grant select on public.creator_treaty_ops_operation_cycles to authenticated;
grant select on public.creator_treaty_ops_periodic_review_cycles to authenticated;
grant select on public.creator_treaty_ops_governing_body_sessions to authenticated;

grant all on
  public.future_phase17_approval_packages,
  public.phase17_readiness_evidence,
  public.phase17_blockers,
  public.phase17_activation_decisions,
  public.creator_treaty_ops_operation_cycles,
  public.creator_treaty_ops_periodic_review_cycles,
  public.creator_treaty_ops_governing_body_sessions
to service_role;

drop policy if exists p17_packages_read on public.future_phase17_approval_packages;
create policy p17_packages_read on public.future_phase17_approval_packages for select to authenticated using (true);
drop policy if exists p17_evidence_read on public.phase17_readiness_evidence;
create policy p17_evidence_read on public.phase17_readiness_evidence for select to authenticated using (true);
drop policy if exists p17_blockers_read on public.phase17_blockers;
create policy p17_blockers_read on public.phase17_blockers for select to authenticated using (true);
drop policy if exists p17_activation_read on public.phase17_activation_decisions;
create policy p17_activation_read on public.phase17_activation_decisions for select to authenticated using (true);
drop policy if exists p17_cycles_read on public.creator_treaty_ops_operation_cycles;
create policy p17_cycles_read on public.creator_treaty_ops_operation_cycles for select to authenticated using (true);
drop policy if exists p17_reviews_read on public.creator_treaty_ops_periodic_review_cycles;
create policy p17_reviews_read on public.creator_treaty_ops_periodic_review_cycles for select to authenticated using (true);
drop policy if exists p17_sessions_read on public.creator_treaty_ops_governing_body_sessions;
create policy p17_sessions_read on public.creator_treaty_ops_governing_body_sessions for select to authenticated using (true);

drop policy if exists p17_packages_service on public.future_phase17_approval_packages;
create policy p17_packages_service on public.future_phase17_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p17_evidence_service on public.phase17_readiness_evidence;
create policy p17_evidence_service on public.phase17_readiness_evidence for all to service_role using (true) with check (true);
drop policy if exists p17_blockers_service on public.phase17_blockers;
create policy p17_blockers_service on public.phase17_blockers for all to service_role using (true) with check (true);
drop policy if exists p17_activation_service on public.phase17_activation_decisions;
create policy p17_activation_service on public.phase17_activation_decisions for all to service_role using (true) with check (true);
drop policy if exists p17_cycles_service on public.creator_treaty_ops_operation_cycles;
create policy p17_cycles_service on public.creator_treaty_ops_operation_cycles for all to service_role using (true) with check (true);
drop policy if exists p17_reviews_service on public.creator_treaty_ops_periodic_review_cycles;
create policy p17_reviews_service on public.creator_treaty_ops_periodic_review_cycles for all to service_role using (true) with check (true);
drop policy if exists p17_sessions_service on public.creator_treaty_ops_governing_body_sessions;
create policy p17_sessions_service on public.creator_treaty_ops_governing_body_sessions for all to service_role using (true) with check (true);

comment on table public.future_phase17_approval_packages is 'Phase 17 durable approval packages; Phase 16 flags never authorize treaty operations launch.';

commit;
