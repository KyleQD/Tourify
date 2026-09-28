-- Phase 10 S0–S2: federation entities, org memberships, reserved powers, flags.

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

create table if not exists public.creator_federation_entities (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  legal_name text not null,
  jurisdiction text not null,
  status text not null default 'draft' check (status in (
    'draft', 'counsel_pending', 'sandbox', 'ready', 'active', 'suspended', 'dissolved'
  )),
  production_authority boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_federation_memberships (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id) on delete restrict,
  member_organization_id uuid not null,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'diligence', 'local_approved', 'federation_review',
    'active', 'suspended', 'withdrawn', 'expelled', 'rejected'
  )),
  version integer not null default 1,
  effective_at timestamptz,
  expires_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (federation_entity_id, member_organization_id, version)
);

create table if not exists public.creator_federation_reserved_powers (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.creator_federation_memberships(id) on delete cascade,
  power_key text not null,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique (membership_id, power_key, policy_version)
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_federation_readiness_enabled', 'Federation readiness', 'Federation education hub.', false, 0),
  ('creator_federation_entity_registry_enabled', 'Federation entity registry', 'Entity registry.', false, 0),
  ('creator_federation_membership_enabled', 'Federation membership', 'Org membership applications.', false, 0),
  ('creator_federation_sovereignty_controls_enabled', 'Federation sovereignty', 'Reserved powers controls.', false, 0),
  ('creator_federation_trust_registry_enabled', 'Federation trust registry', 'Sandbox trust issuers.', false, 0),
  ('creator_federation_credentials_enabled', 'Federation credentials', 'Sandbox credentials.', false, 0),
  ('creator_federation_wallet_interop_enabled', 'Federation wallet interop', 'Wallet interop stubs.', false, 0),
  ('creator_federation_mandates_enabled', 'Federation mandates', 'Scoped admin mandates.', false, 0),
  ('creator_federation_governance_enabled', 'Federation governance', 'Proposals and disputes.', false, 0),
  ('creator_federation_voting_enabled', 'Federation voting', 'Ballot casting.', false, 0),
  ('creator_federation_cross_border_data_enabled', 'Federation cross-border', 'Transfer assessments.', false, 0),
  ('creator_federation_research_enabled', 'Federation research', 'Separately gated.', false, 0),
  ('creator_federation_policy_observatory_enabled', 'Federation policy observatory', 'Policy observatory stubs.', false, 0),
  ('creator_federation_service_directory_enabled', 'Federation service directory', 'Private directory.', false, 0),
  ('creator_federation_public_api_enabled', 'Federation public API', 'Separately gated; default deny.', false, 0),
  ('creator_federation_finance_enabled', 'Federation finance', 'Separately gated; default deny.', false, 0),
  ('creator_federation_representation_network_enabled', 'Federation representation', 'Separately gated; default deny.', false, 0),
  ('creator_federation_collective_licensing_enabled', 'Federation collective licensing', 'Separately gated; default deny.', false, 0),
  ('creator_federation_collective_bargaining_enabled', 'Federation collective bargaining', 'Separately gated; default deny.', false, 0),
  ('creator_federation_tokenized_membership_enabled', 'Federation tokenized membership', 'Separately gated; default deny.', false, 0),
  ('creator_federation_admin_ops_enabled', 'Federation admin ops', 'Ops kill switches.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.creator_federation_entities enable row level security;
alter table public.creator_federation_memberships enable row level security;
alter table public.creator_federation_reserved_powers enable row level security;

revoke all on
  public.creator_federation_entities,
  public.creator_federation_memberships,
  public.creator_federation_reserved_powers
from anon, authenticated;

grant select on public.creator_federation_entities to authenticated;
grant select, insert, update on public.creator_federation_memberships to authenticated;
grant select on public.creator_federation_reserved_powers to authenticated;

grant all on
  public.creator_federation_entities,
  public.creator_federation_memberships,
  public.creator_federation_reserved_powers
to service_role;

drop policy if exists cf_entities_read on public.creator_federation_entities;
create policy cf_entities_read on public.creator_federation_entities
for select to authenticated using (true);

drop policy if exists cf_memberships_access on public.creator_federation_memberships;
create policy cf_memberships_access on public.creator_federation_memberships
for all to authenticated using (applicant_user_id = (select auth.uid()))
with check (applicant_user_id = (select auth.uid()));

drop policy if exists cf_powers_read on public.creator_federation_reserved_powers;
create policy cf_powers_read on public.creator_federation_reserved_powers
for select to authenticated using (exists (
  select 1 from public.creator_federation_memberships m
  where m.id = membership_id and m.applicant_user_id = (select auth.uid())
));

drop policy if exists cf_entities_service on public.creator_federation_entities;
create policy cf_entities_service on public.creator_federation_entities for all to service_role using (true) with check (true);
drop policy if exists cf_memberships_service on public.creator_federation_memberships;
create policy cf_memberships_service on public.creator_federation_memberships for all to service_role using (true) with check (true);
drop policy if exists cf_powers_service on public.creator_federation_reserved_powers;
create policy cf_powers_service on public.creator_federation_reserved_powers for all to service_role using (true) with check (true);

comment on table public.creator_federation_memberships is 'Org federation membership; never implied by Phase 9 cooperative membership.';

commit;
