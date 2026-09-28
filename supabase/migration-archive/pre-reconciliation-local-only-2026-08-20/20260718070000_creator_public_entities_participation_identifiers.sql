-- Phase 11 S0–S2: public-interest entity readiness, participation, sandbox identifiers, flags.

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

create table if not exists public.creator_public_infrastructure_entities (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  entity_kind text not null default 'public_interest' check (entity_kind in (
    'public_interest', 'steward', 'sandbox'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'counsel_pending', 'sandbox', 'ready', 'active', 'suspended', 'dissolved'
  )),
  jurisdiction text,
  governance_policy_version text not null default '1.0.0',
  production_authority boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_public_infrastructure_participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid,
  entity_id uuid not null references public.creator_public_infrastructure_entities(id) on delete restrict,
  status text not null default 'draft' check (status in (
    'draft', 'active', 'suspended', 'withdrawing', 'withdrawn'
  )),
  terms_version text not null default '1.0.0',
  activated_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_identifiers (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.creator_public_infrastructure_participations(id) on delete cascade,
  public_identifier text not null unique,
  method text not null default 'sandbox_did' check (method in (
    'sandbox_did', 'opaque_handle', 'controlled_reference'
  )),
  status text not null default 'active' check (status in (
    'active', 'suspended', 'deactivated', 'revoked'
  )),
  document_json jsonb not null default '{}'::jsonb,
  controller_version integer not null default 1,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_public_infrastructure_readiness_enabled', 'Public infrastructure readiness', 'Readiness hub.', false, 0),
  ('creator_public_infrastructure_entity_enabled', 'Public infrastructure entity', 'Entity readiness.', false, 0),
  ('creator_public_infrastructure_participation_enabled', 'Public infrastructure participation', 'Enrollment/withdrawal.', false, 0),
  ('creator_public_infrastructure_identifier_enabled', 'Public infrastructure identifiers', 'Sandbox identifiers.', false, 0),
  ('creator_public_infrastructure_trust_registry_enabled', 'Public infrastructure trust', 'Trust registry projections.', false, 0),
  ('creator_public_infrastructure_credentials_enabled', 'Public infrastructure credentials', 'Participant credentials.', false, 0),
  ('creator_public_infrastructure_rights_resolver_enabled', 'Public infrastructure rights resolver', 'Rights-reference status views.', false, 0),
  ('creator_public_infrastructure_service_directory_enabled', 'Public infrastructure directory', 'Bilateral service discovery.', false, 0),
  ('creator_public_infrastructure_conformance_enabled', 'Public infrastructure conformance', 'Conformance runs.', false, 0),
  ('creator_public_infrastructure_public_api_enabled', 'Public infrastructure public API', 'Separately gated; default deny.', false, 0),
  ('creator_public_infrastructure_open_source_enabled', 'Public infrastructure open source', 'Open protocol publishing.', false, 0),
  ('creator_public_infrastructure_cross_border_enabled', 'Public infrastructure cross-border', 'Cross-border stubs.', false, 0),
  ('creator_public_infrastructure_transparency_log_enabled', 'Public infrastructure transparency', 'Transparency log stubs.', false, 0),
  ('creator_public_infrastructure_research_enabled', 'Public infrastructure research', 'Separately gated.', false, 0),
  ('creator_public_infrastructure_funding_enabled', 'Public infrastructure funding', 'Separately gated; default deny.', false, 0),
  ('creator_public_infrastructure_regulator_gateway_enabled', 'Public infrastructure regulator gateway', 'Separately gated; default deny.', false, 0),
  ('creator_public_infrastructure_universal_identifier_enabled', 'Universal identifier', 'HARD-DISABLED.', false, 0),
  ('creator_public_infrastructure_global_mandate_enabled', 'Global mandate', 'HARD-DISABLED.', false, 0),
  ('creator_public_infrastructure_collective_action_enabled', 'Collective action', 'HARD-DISABLED.', false, 0),
  ('creator_public_infrastructure_tokenized_identity_enabled', 'Tokenized identity', 'HARD-DISABLED.', false, 0),
  ('creator_public_infrastructure_admin_ops_enabled', 'Public infrastructure admin ops', 'Ops kill switches.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.creator_public_infrastructure_entities enable row level security;
alter table public.creator_public_infrastructure_participations enable row level security;
alter table public.creator_public_identifiers enable row level security;

revoke all on
  public.creator_public_infrastructure_entities,
  public.creator_public_infrastructure_participations,
  public.creator_public_identifiers
from anon, authenticated;

grant select on public.creator_public_infrastructure_entities to authenticated;
grant select, insert, update on public.creator_public_infrastructure_participations to authenticated;
grant select, insert, update on public.creator_public_identifiers to authenticated;

grant all on
  public.creator_public_infrastructure_entities,
  public.creator_public_infrastructure_participations,
  public.creator_public_identifiers
to service_role;

drop policy if exists cpi_entities_read on public.creator_public_infrastructure_entities;
create policy cpi_entities_read on public.creator_public_infrastructure_entities
for select to authenticated using (true);

drop policy if exists cpi_participations_access on public.creator_public_infrastructure_participations;
create policy cpi_participations_access on public.creator_public_infrastructure_participations
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists cpi_identifiers_access on public.creator_public_identifiers;
create policy cpi_identifiers_access on public.creator_public_identifiers
for all to authenticated using (exists (
  select 1 from public.creator_public_infrastructure_participations p
  where p.id = participation_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.creator_public_infrastructure_participations p
  where p.id = participation_id and p.user_id = (select auth.uid())
));

drop policy if exists cpi_entities_service on public.creator_public_infrastructure_entities;
create policy cpi_entities_service on public.creator_public_infrastructure_entities for all to service_role using (true) with check (true);
drop policy if exists cpi_participations_service on public.creator_public_infrastructure_participations;
create policy cpi_participations_service on public.creator_public_infrastructure_participations for all to service_role using (true) with check (true);
drop policy if exists cpi_identifiers_service on public.creator_public_identifiers;
create policy cpi_identifiers_service on public.creator_public_identifiers for all to service_role using (true) with check (true);

comment on table public.creator_public_identifiers is 'Sandbox optional identifiers; never imply ownership or Tourify/Phase 8–10 authority.';

commit;
