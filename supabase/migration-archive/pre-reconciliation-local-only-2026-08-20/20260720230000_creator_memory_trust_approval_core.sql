-- Phase 20 S0–S2: approval packages, trusts, charters, participation, cultural authorities.
-- ADR P20-001: creator_memory_* + future_phase20_approval_packages; flags creator_cultural_memory_trust_*.

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

create table if not exists public.future_phase20_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'proposed',
  jurisdiction text,
  dual_control boolean not null default false,
  phase19_proofs_complete boolean not null default false,
  legal_entity_verified boolean not null default false,
  charter_effective boolean not null default false,
  community_governance_approved boolean not null default false,
  multiple_custodians boolean not null default false,
  independent_implementations boolean not null default false,
  restore_passed boolean not null default false,
  restriction_propagation_passed boolean not null default false,
  provider_replacement_passed boolean not null default false,
  tourify_unavailable_passed boolean not null default false,
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

create table if not exists public.creator_memory_trusts (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase20_approval_packages(id) on delete set null,
  legal_name text not null,
  legal_character text not null default 'proposed',
  jurisdiction text not null,
  state text not null default 'draft',
  charter_version text,
  production_authority boolean not null default false,
  claims_compulsory_deposit boolean not null default false,
  claims_universal_identity boolean not null default false,
  claims_perpetual_authority boolean not null default false,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  source_manifest_id uuid,
  actor_authority_id uuid,
  idempotency_key text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_charters (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references public.creator_memory_trusts(id) on delete cascade,
  charter_key text not null,
  state text not null default 'draft',
  version text not null default '0.1.0',
  public_summary text,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(trust_id, charter_key, version)
);

create table if not exists public.creator_memory_trust_participations (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references public.creator_memory_trusts(id) on delete cascade,
  participant_user_id uuid references auth.users(id) on delete set null,
  participant_org_id uuid,
  state text not null default 'draft',
  voluntary boolean not null default true,
  joined_at timestamptz,
  withdrawn_at timestamptz,
  policy_version text not null default '1.0.0',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_cultural_authorities (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references public.creator_memory_trusts(id) on delete cascade,
  authority_name text not null,
  scope jsonb not null default '[]'::jsonb,
  territories jsonb not null default '[]'::jsonb,
  state text not null default 'under_review',
  evidence_manifest_id uuid,
  disputed_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_cultural_memory_trust_readiness_enabled', 'Cultural memory trust readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_cultural_memory_trust_entity_enabled', 'Cultural memory trust entity', 'Trust entity records.', false, 0),
  ('creator_cultural_memory_trust_charter_enabled', 'Cultural memory trust charter', 'Charter governance stubs.', false, 0),
  ('creator_cultural_memory_trust_participation_enabled', 'Cultural memory trust participation', 'Voluntary participation.', false, 0),
  ('creator_cultural_memory_trust_deposit_enabled', 'Cultural memory trust deposit', 'Voluntary deposit stubs.', false, 0),
  ('creator_cultural_memory_trust_withdrawal_enabled', 'Cultural memory trust withdrawal', 'Withdrawal stubs.', false, 0),
  ('creator_cultural_memory_trust_cultural_authority_enabled', 'Cultural memory trust cultural authority', 'Authority mapping.', false, 0),
  ('creator_cultural_memory_trust_community_councils_enabled', 'Cultural memory trust community councils', 'Council stubs.', false, 0),
  ('creator_cultural_memory_trust_indigenous_governance_enabled', 'Cultural memory trust Indigenous governance', 'Indigenous safeguards.', false, 0),
  ('creator_cultural_memory_trust_appraisal_enabled', 'Cultural memory trust appraisal', 'Appraisal stubs.', false, 0),
  ('creator_cultural_memory_trust_custodian_accreditation_enabled', 'Cultural memory trust custodian accreditation', 'Custodian qualification.', false, 0),
  ('creator_cultural_memory_trust_distributed_custody_enabled', 'Cultural memory trust distributed custody', 'Multi-custodian stubs.', false, 0),
  ('creator_cultural_memory_trust_custody_transfer_enabled', 'Cultural memory trust custody transfer', 'Custody transfer stubs.', false, 0),
  ('creator_cultural_memory_trust_preservation_profiles_enabled', 'Cultural memory trust preservation profiles', 'Preservation profiles.', false, 0),
  ('creator_cultural_memory_trust_information_packages_enabled', 'Cultural memory trust information packages', 'Deep-time packages.', false, 0),
  ('creator_cultural_memory_trust_fixity_enabled', 'Cultural memory trust fixity', 'Fixity events.', false, 0),
  ('creator_cultural_memory_trust_emulation_enabled', 'Cultural memory trust emulation', 'Emulation stubs.', false, 0),
  ('creator_cultural_memory_trust_identifiers_enabled', 'Cultural memory trust identifiers', 'Deep-time identifiers.', false, 0),
  ('creator_cultural_memory_trust_crypto_succession_enabled', 'Cultural memory trust crypto succession', 'Crypto succession stubs.', false, 0),
  ('creator_cultural_memory_trust_language_enabled', 'Cultural memory trust language', 'Linguistic continuity.', false, 0),
  ('creator_cultural_memory_trust_oral_tradition_enabled', 'Cultural memory trust oral tradition', 'Oral memory stubs.', false, 0),
  ('creator_cultural_memory_trust_sensitive_materials_enabled', 'Cultural memory trust sensitive materials', 'Sensitive material controls.', false, 0),
  ('creator_cultural_memory_trust_privacy_embargo_enabled', 'Cultural memory trust privacy embargo', 'Privacy/embargo review.', false, 0),
  ('creator_cultural_memory_trust_mediated_access_enabled', 'Cultural memory trust mediated access', 'Mediated access stubs.', false, 0),
  ('creator_cultural_memory_trust_dark_archive_enabled', 'Cultural memory trust dark archive', 'HARD-DISABLED break-glass.', false, 0),
  ('creator_cultural_memory_trust_public_finding_aids_enabled', 'Cultural memory trust public finding aids', 'Minimal finding aids.', false, 0),
  ('creator_cultural_memory_trust_repatriation_enabled', 'Cultural memory trust repatriation', 'Repatriation stubs.', false, 0),
  ('creator_cultural_memory_trust_remediation_enabled', 'Cultural memory trust remediation', 'Remediation stubs.', false, 0),
  ('creator_cultural_memory_trust_contested_records_enabled', 'Cultural memory trust contested records', 'Dispute stubs.', false, 0),
  ('creator_cultural_memory_trust_rights_reference_enabled', 'Cultural memory trust rights reference', 'Rights references only.', false, 0),
  ('creator_cultural_memory_trust_ai_reuse_enabled', 'Cultural memory trust AI reuse controls', 'AI reuse control surface.', false, 0),
  ('creator_cultural_memory_trust_research_reuse_enabled', 'Cultural memory trust research reuse', 'Research reuse stubs.', false, 0),
  ('creator_cultural_memory_trust_disaster_response_enabled', 'Cultural memory trust disaster response', 'Disaster stubs.', false, 0),
  ('creator_cultural_memory_trust_offline_copies_enabled', 'Cultural memory trust offline copies', 'Offline preservation stubs.', false, 0),
  ('creator_cultural_memory_trust_preservation_fund_enabled', 'Cultural memory trust preservation fund', 'HARD-DISABLED.', false, 0),
  ('creator_cultural_memory_trust_provider_replacement_enabled', 'Cultural memory trust provider replacement', 'Provider replacement stubs.', false, 0),
  ('creator_cultural_memory_trust_public_asset_register_enabled', 'Cultural memory trust public asset register', 'Asset register stubs.', false, 0),
  ('creator_cultural_memory_trust_external_assurance_enabled', 'Cultural memory trust external assurance', 'Assurance stubs.', false, 0),
  ('creator_cultural_memory_trust_public_activation_enabled', 'Cultural memory trust public activation', 'HARD-DISABLED.', false, 0),
  ('creator_cultural_memory_trust_dissolution_enabled', 'Cultural memory trust dissolution', 'HARD-DISABLED live dissolution.', false, 0),
  ('creator_cultural_memory_trust_tourify_unavailable_enabled', 'Cultural memory trust Tourify-unavailable', 'Tourify-unavailable drills.', false, 0),
  ('creator_cultural_memory_trust_phase21_handoff_enabled', 'Cultural memory trust Phase 21 handoff', 'HARD-DISABLED feature ship.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase20_approval_packages enable row level security;
alter table public.creator_memory_trusts enable row level security;
alter table public.creator_memory_charters enable row level security;
alter table public.creator_memory_trust_participations enable row level security;
alter table public.creator_memory_cultural_authorities enable row level security;

revoke all on
  public.future_phase20_approval_packages,
  public.creator_memory_trusts,
  public.creator_memory_charters,
  public.creator_memory_trust_participations,
  public.creator_memory_cultural_authorities
from anon, authenticated;

grant select on public.future_phase20_approval_packages to authenticated;
grant select on public.creator_memory_trusts to authenticated;
grant select on public.creator_memory_charters to authenticated;
grant select on public.creator_memory_trust_participations to authenticated;
grant select on public.creator_memory_cultural_authorities to authenticated;

grant all on
  public.future_phase20_approval_packages,
  public.creator_memory_trusts,
  public.creator_memory_charters,
  public.creator_memory_trust_participations,
  public.creator_memory_cultural_authorities
to service_role;

drop policy if exists p20_packages_read on public.future_phase20_approval_packages;
create policy p20_packages_read on public.future_phase20_approval_packages for select to authenticated using (true);
drop policy if exists p20_trusts_read on public.creator_memory_trusts;
create policy p20_trusts_read on public.creator_memory_trusts for select to authenticated using (true);
drop policy if exists p20_charters_read on public.creator_memory_charters;
create policy p20_charters_read on public.creator_memory_charters for select to authenticated using (true);
drop policy if exists p20_participations_read on public.creator_memory_trust_participations;
create policy p20_participations_read on public.creator_memory_trust_participations for select to authenticated using (true);
drop policy if exists p20_authorities_read on public.creator_memory_cultural_authorities;
create policy p20_authorities_read on public.creator_memory_cultural_authorities for select to authenticated using (true);

drop policy if exists p20_packages_service on public.future_phase20_approval_packages;
create policy p20_packages_service on public.future_phase20_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p20_trusts_service on public.creator_memory_trusts;
create policy p20_trusts_service on public.creator_memory_trusts for all to service_role using (true) with check (true);
drop policy if exists p20_charters_service on public.creator_memory_charters;
create policy p20_charters_service on public.creator_memory_charters for all to service_role using (true) with check (true);
drop policy if exists p20_participations_service on public.creator_memory_trust_participations;
create policy p20_participations_service on public.creator_memory_trust_participations for all to service_role using (true) with check (true);
drop policy if exists p20_authorities_service on public.creator_memory_cultural_authorities;
create policy p20_authorities_service on public.creator_memory_cultural_authorities for all to service_role using (true) with check (true);

comment on table public.future_phase20_approval_packages is 'Phase 20 durable approval packages; Phase 19 flags never authorize cultural-memory trust launch.';

commit;
