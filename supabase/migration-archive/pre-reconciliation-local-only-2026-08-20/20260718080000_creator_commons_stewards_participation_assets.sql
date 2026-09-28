-- Phase 12 S0–S2: steward entity, participation, critical asset inventory, flags.

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

create table if not exists public.creator_commons_stewards (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  jurisdiction text,
  status text not null default 'draft' check (status in (
    'draft', 'diligence', 'public_review', 'approved', 'sandbox',
    'limited_production', 'production', 'suspended', 'transition', 'retired', 'rejected'
  )),
  charter_version text,
  policy_version text not null default '1.0.0',
  production_authority boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_participations (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid not null references public.creator_commons_stewards(id) on delete restrict,
  participant_user_id uuid references auth.users(id) on delete cascade,
  participant_organization_id uuid,
  status text not null default 'applied' check (status in (
    'applied', 'active', 'suspended', 'withdrawing', 'withdrawn', 'rejected'
  )),
  scopes jsonb not null default '[]'::jsonb,
  policy_version text not null default '1.0.0',
  activated_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((participant_user_id is not null) <> (participant_organization_id is not null))
);

create table if not exists public.creator_commons_assets (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id) on delete set null,
  asset_kind text not null check (asset_kind in (
    'domain', 'trademark', 'repository', 'package_namespace', 'schema_uri',
    'signing_key', 'cloud_account', 'documentation', 'other'
  )),
  display_name text not null,
  legal_owner_party_id uuid,
  custodian_party_id uuid,
  operator_party_id uuid,
  transfer_status text not null default 'unreviewed' check (transfer_status in (
    'unreviewed', 'restricted', 'transferable', 'escrowed', 'transferred'
  )),
  evidence_manifest_id uuid,
  public_projection jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_digital_commons_readiness_enabled', 'Digital commons readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_digital_commons_steward_entity_enabled', 'Digital commons steward', 'Steward entity readiness.', false, 0),
  ('creator_digital_commons_participation_enabled', 'Digital commons participation', 'Explicit enrollment.', false, 0),
  ('creator_digital_commons_asset_register_enabled', 'Digital commons asset register', 'Critical asset inventory.', false, 0),
  ('creator_digital_commons_asset_escrow_enabled', 'Digital commons asset escrow', 'Escrow checklist stubs.', false, 0),
  ('creator_digital_commons_protocol_governance_enabled', 'Digital commons protocols', 'Protocol sandbox.', false, 0),
  ('creator_digital_commons_registry_sandbox_enabled', 'Digital commons registry', 'Registry sandbox.', false, 0),
  ('creator_digital_commons_identifier_sandbox_enabled', 'Digital commons identifiers', 'Identifier sandbox.', false, 0),
  ('creator_digital_commons_credentials_sandbox_enabled', 'Digital commons credentials', 'Credential sandbox.', false, 0),
  ('creator_digital_commons_conformance_enabled', 'Digital commons conformance', 'Conformance results.', false, 0),
  ('creator_digital_commons_operator_accreditation_enabled', 'Digital commons operators', 'Operator accreditation.', false, 0),
  ('creator_digital_commons_public_api_sandbox_enabled', 'Digital commons public API', 'Separately gated; default deny.', false, 0),
  ('creator_digital_commons_transition_escrow_enabled', 'Digital commons transition', 'Transition escrow planner.', false, 0),
  ('creator_digital_commons_public_status_enabled', 'Digital commons public status', 'Public status stubs.', false, 0),
  ('creator_digital_commons_limited_production_enabled', 'Digital commons limited production', 'Separately gated.', false, 0),
  ('creator_digital_commons_irreversible_asset_transfer_enabled', 'Irreversible asset transfer', 'HARD-DISABLED.', false, 0),
  ('creator_digital_commons_universal_identifier_enabled', 'Universal identifier', 'HARD-DISABLED.', false, 0),
  ('creator_digital_commons_global_mandate_enabled', 'Global mandate', 'HARD-DISABLED.', false, 0),
  ('creator_digital_commons_collective_action_enabled', 'Collective action', 'HARD-DISABLED.', false, 0),
  ('creator_digital_commons_tokenized_identity_enabled', 'Tokenized identity', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.creator_commons_stewards enable row level security;
alter table public.creator_commons_participations enable row level security;
alter table public.creator_commons_assets enable row level security;

revoke all on
  public.creator_commons_stewards,
  public.creator_commons_participations,
  public.creator_commons_assets
from anon, authenticated;

grant select on public.creator_commons_stewards to authenticated;
grant select, insert, update on public.creator_commons_participations to authenticated;
grant select on public.creator_commons_assets to authenticated;

grant all on
  public.creator_commons_stewards,
  public.creator_commons_participations,
  public.creator_commons_assets
to service_role;

drop policy if exists cc_stewards_read on public.creator_commons_stewards;
create policy cc_stewards_read on public.creator_commons_stewards
for select to authenticated using (true);

drop policy if exists cc_participations_access on public.creator_commons_participations;
create policy cc_participations_access on public.creator_commons_participations
for all to authenticated using (participant_user_id = (select auth.uid()))
with check (participant_user_id = (select auth.uid()));

drop policy if exists cc_assets_read on public.creator_commons_assets;
create policy cc_assets_read on public.creator_commons_assets
for select to authenticated using (true);

drop policy if exists cc_stewards_service on public.creator_commons_stewards;
create policy cc_stewards_service on public.creator_commons_stewards for all to service_role using (true) with check (true);
drop policy if exists cc_participations_service on public.creator_commons_participations;
create policy cc_participations_service on public.creator_commons_participations for all to service_role using (true) with check (true);
drop policy if exists cc_assets_service on public.creator_commons_assets;
create policy cc_assets_service on public.creator_commons_assets for all to service_role using (true) with check (true);

comment on table public.creator_commons_participations is 'Explicit commons participation; never implied by Tourify or Phase 8–11 relationships.';
comment on table public.creator_commons_assets is 'Critical asset inventory; public_projection must exclude secrets; irreversible transfer hard-disabled.';

commit;
