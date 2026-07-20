-- Phase 15 S0–S2: approval packages, organizations, instruments, participants, memberships.
-- ADR P15-001: creator_interop_org_* avoids Phase 14 creator_interop_* collisions.

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

create table if not exists public.future_phase15_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  legal_character text not null default 'domestic_nonprofit',
  jurisdiction text,
  dual_control boolean not null default false,
  legal_feasibility_signed boolean not null default false,
  constitutive_path_approved boolean not null default false,
  independent_review_complete boolean not null default false,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  source_manifest_id uuid,
  evidence_manifest jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_organizations (
  id uuid primary key default gen_random_uuid(),
  approval_package_id uuid references public.future_phase15_approval_packages(id) on delete set null,
  legal_character text not null default 'domestic_nonprofit',
  public_name text not null,
  status text not null default 'proposed' check (status in (
    'proposed', 'sandbox', 'limited_pilot', 'suspended', 'revoked', 'retired'
  )),
  production_authority boolean not null default false,
  claims_treaty_status boolean not null default false,
  claims_io_status boolean not null default false,
  claims_un_relationship boolean not null default false,
  policy_version text not null default '1.0.0',
  effective_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_constitutive_instruments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.creator_interop_org_organizations(id) on delete cascade,
  version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'adopted', 'effective', 'superseded', 'withdrawn'
  )),
  authentic_languages text[] not null default '{}',
  content_hash text not null,
  effective_at timestamptz,
  supersedes_id uuid,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_participant_authorities (
  id uuid primary key default gen_random_uuid(),
  participant_external_ref text not null,
  participant_class text not null check (participant_class in (
    'state', 'international_organization', 'creator_body', 'observer'
  )),
  authority_type text not null,
  instrument_hash text not null,
  jurisdiction text not null,
  effective_at timestamptz,
  expires_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.creator_interop_org_organizations(id) on delete cascade,
  participant_authority_id uuid references public.creator_interop_org_participant_authorities(id) on delete set null,
  state text not null default 'draft' check (state in (
    'draft', 'invited', 'signed', 'approved', 'instrument_deposited',
    'effective', 'suspended', 'withdrawing', 'withdrawn', 'rejected'
  )),
  instrument_deposited_at timestamptz,
  effective_at timestamptz,
  withdrawal_effective_at timestamptz,
  policy_version text not null default '1.0.0',
  audit_event_id uuid,
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_interop_org_readiness_enabled', 'Interop org readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_interop_org_entity_options_enabled', 'Interop org entity options', 'Entity path sandbox.', false, 0),
  ('creator_interop_org_constitutive_drafting_enabled', 'Interop org constitutive drafting', 'Instrument drafts.', false, 0),
  ('creator_interop_org_participant_applications_enabled', 'Interop org participant applications', 'Authority sandbox.', false, 0),
  ('creator_interop_org_observer_program_enabled', 'Interop org observer program', 'Observer stubs.', false, 0),
  ('creator_interop_org_governance_sandbox_enabled', 'Interop org governance sandbox', 'Organs/decisions sandbox.', false, 0),
  ('creator_interop_org_headquarters_readiness_enabled', 'Interop org HQ readiness', 'Host/HQ stubs.', false, 0),
  ('creator_interop_org_privileges_enabled', 'Interop org privileges', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_member_state_status_enabled', 'Interop org member-state status', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_io_membership_enabled', 'Interop org IO membership', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_treaty_status_enabled', 'Interop org treaty status', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_depositary_enabled', 'Interop org depositary', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_un_relationship_enabled', 'Interop org UN relationship', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_specialized_agency_claim_enabled', 'Interop org specialized agency', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_assessed_contributions_enabled', 'Interop org assessed contributions', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_voluntary_funding_enabled', 'Interop org voluntary funding', 'Sandbox only.', false, 0),
  ('creator_interop_org_service_fees_enabled', 'Interop org service fees', 'Sandbox only.', false, 0),
  ('creator_interop_org_staff_regime_enabled', 'Interop org staff regime', 'Sandbox only.', false, 0),
  ('creator_interop_org_admin_justice_enabled', 'Interop org admin justice', 'Sandbox only.', false, 0),
  ('creator_interop_org_relationship_agreements_enabled', 'Interop org relationship agreements', 'Sandbox only.', false, 0),
  ('creator_interop_org_public_registry_enabled', 'Interop org public registry', 'Sandbox projections.', false, 0),
  ('creator_interop_org_conformance_enabled', 'Interop org conformance', 'Sandbox only.', false, 0),
  ('creator_interop_org_capacity_building_enabled', 'Interop org capacity building', 'Sandbox only.', false, 0),
  ('creator_interop_org_collective_action_enabled', 'Interop org collective action', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_regulatory_power_enabled', 'Interop org regulatory power', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_diplomatic_status_enabled', 'Interop org diplomatic status', 'HARD-DISABLED.', false, 0),
  ('creator_interop_org_production_enabled', 'Interop org production', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase15_approval_packages enable row level security;
alter table public.creator_interop_org_organizations enable row level security;
alter table public.creator_interop_org_constitutive_instruments enable row level security;
alter table public.creator_interop_org_participant_authorities enable row level security;
alter table public.creator_interop_org_memberships enable row level security;

revoke all on
  public.future_phase15_approval_packages,
  public.creator_interop_org_organizations,
  public.creator_interop_org_constitutive_instruments,
  public.creator_interop_org_participant_authorities,
  public.creator_interop_org_memberships
from anon, authenticated;

grant select on public.future_phase15_approval_packages to authenticated;
grant select on public.creator_interop_org_organizations to authenticated;
grant select on public.creator_interop_org_constitutive_instruments to authenticated;
grant select on public.creator_interop_org_participant_authorities to authenticated;
grant select on public.creator_interop_org_memberships to authenticated;

grant all on
  public.future_phase15_approval_packages,
  public.creator_interop_org_organizations,
  public.creator_interop_org_constitutive_instruments,
  public.creator_interop_org_participant_authorities,
  public.creator_interop_org_memberships
to service_role;

drop policy if exists p15_packages_read on public.future_phase15_approval_packages;
create policy p15_packages_read on public.future_phase15_approval_packages for select to authenticated using (true);
drop policy if exists p15_orgs_read on public.creator_interop_org_organizations;
create policy p15_orgs_read on public.creator_interop_org_organizations for select to authenticated using (true);
drop policy if exists p15_instruments_read on public.creator_interop_org_constitutive_instruments;
create policy p15_instruments_read on public.creator_interop_org_constitutive_instruments for select to authenticated using (true);
drop policy if exists p15_authorities_read on public.creator_interop_org_participant_authorities;
create policy p15_authorities_read on public.creator_interop_org_participant_authorities for select to authenticated using (true);
drop policy if exists p15_memberships_read on public.creator_interop_org_memberships;
create policy p15_memberships_read on public.creator_interop_org_memberships for select to authenticated using (true);

drop policy if exists p15_packages_service on public.future_phase15_approval_packages;
create policy p15_packages_service on public.future_phase15_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p15_orgs_service on public.creator_interop_org_organizations;
create policy p15_orgs_service on public.creator_interop_org_organizations for all to service_role using (true) with check (true);
drop policy if exists p15_instruments_service on public.creator_interop_org_constitutive_instruments;
create policy p15_instruments_service on public.creator_interop_org_constitutive_instruments for all to service_role using (true) with check (true);
drop policy if exists p15_authorities_service on public.creator_interop_org_participant_authorities;
create policy p15_authorities_service on public.creator_interop_org_participant_authorities for all to service_role using (true) with check (true);
drop policy if exists p15_memberships_service on public.creator_interop_org_memberships;
create policy p15_memberships_service on public.creator_interop_org_memberships for all to service_role using (true) with check (true);

comment on table public.future_phase15_approval_packages is 'Phase 15 durable approval packages; Phase 14 flags never authorize organization launch.';

commit;
