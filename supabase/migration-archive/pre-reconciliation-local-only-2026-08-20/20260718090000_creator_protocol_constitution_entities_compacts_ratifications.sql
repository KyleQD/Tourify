-- Phase 13 S0–S2: constitutions, compact memberships, provisions, flags.

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

create table if not exists public.creator_protocol_constitutions (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null default '',
  legal_entity_id uuid,
  status text not null default 'draft' check (status in (
    'draft', 'diligence', 'public_review', 'ratified', 'sandbox',
    'limited_production', 'production', 'suspended', 'transition', 'retired', 'rejected'
  )),
  charter_version text not null default '0.1.0',
  policy_version text not null default '1.0.0',
  jurisdiction text,
  production_authority boolean not null default false,
  effective_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_compact_memberships (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete restrict,
  organization_id uuid not null,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null default '',
  status text not null default 'applied' check (status in (
    'applied', 'local_review', 'approved_locally', 'signed', 'effective',
    'suspended', 'withdrawal_pending', 'withdrawn', 'expired', 'rejected'
  )),
  ratification_instrument_path text,
  reservations jsonb not null default '[]'::jsonb,
  effective_at timestamptz,
  withdrawal_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_provisions (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  provision_key text not null,
  provision_class text not null check (provision_class in (
    'fundamental', 'structural', 'operational', 'advisory'
  )),
  text_hash text not null,
  version text not null,
  effective_at timestamptz not null default now(),
  supersedes_id uuid references public.creator_protocol_provisions(id),
  created_at timestamptz not null default now(),
  unique(constitution_id, provision_key, version)
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_protocol_constitution_readiness_enabled', 'Protocol constitution readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_protocol_constitution_drafting_enabled', 'Protocol constitution drafting', 'Draft constitutions.', false, 0),
  ('creator_protocol_compact_membership_enabled', 'Protocol compact membership', 'Explicit ratification.', false, 0),
  ('creator_protocol_local_sovereignty_enabled', 'Protocol local sovereignty', 'Reserved powers.', false, 0),
  ('creator_protocol_fundamental_provisions_enabled', 'Protocol fundamental provisions', 'Fundamental rights.', false, 0),
  ('creator_protocol_amendment_process_enabled', 'Protocol amendment process', 'Amendment sandbox.', false, 0),
  ('creator_protocol_independent_review_enabled', 'Protocol independent review', 'Appeals sandbox.', false, 0),
  ('creator_protocol_public_deliberation_enabled', 'Protocol public deliberation', 'Objections sandbox.', false, 0),
  ('creator_protocol_asset_covenant_enabled', 'Protocol asset covenant', 'Asset schedule.', false, 0),
  ('creator_protocol_multi_root_trust_enabled', 'Protocol multi-root trust', 'Trust stubs.', false, 0),
  ('creator_protocol_fork_continuity_sandbox_enabled', 'Protocol fork continuity', 'Fork/succession drills.', false, 0),
  ('creator_protocol_operator_constitution_enabled', 'Protocol operator constitution', 'Operator accreditation.', false, 0),
  ('creator_protocol_compact_sandbox_enabled', 'Protocol compact sandbox', 'Compact sandbox.', false, 0),
  ('creator_protocol_public_status_enabled', 'Protocol public status', 'Public status stubs.', false, 0),
  ('creator_protocol_limited_production_enabled', 'Protocol limited production', 'Separately gated.', false, 0),
  ('creator_protocol_irreversible_asset_transfer_enabled', 'Irreversible asset transfer', 'HARD-DISABLED.', false, 0),
  ('creator_protocol_universal_identifier_enabled', 'Universal identifier', 'HARD-DISABLED.', false, 0),
  ('creator_protocol_global_mandate_enabled', 'Global mandate', 'HARD-DISABLED.', false, 0),
  ('creator_protocol_collective_action_enabled', 'Collective action', 'HARD-DISABLED.', false, 0),
  ('creator_protocol_tokenized_governance_enabled', 'Tokenized governance', 'HARD-DISABLED.', false, 0),
  ('creator_protocol_emergency_override_enabled', 'Emergency override', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.creator_protocol_constitutions enable row level security;
alter table public.creator_protocol_compact_memberships enable row level security;
alter table public.creator_protocol_provisions enable row level security;

revoke all on
  public.creator_protocol_constitutions,
  public.creator_protocol_compact_memberships,
  public.creator_protocol_provisions
from anon, authenticated;

grant select on public.creator_protocol_constitutions to authenticated;
grant select, insert, update on public.creator_protocol_compact_memberships to authenticated;
grant select on public.creator_protocol_provisions to authenticated;

grant all on
  public.creator_protocol_constitutions,
  public.creator_protocol_compact_memberships,
  public.creator_protocol_provisions
to service_role;

drop policy if exists cpc_constitutions_read on public.creator_protocol_constitutions;
create policy cpc_constitutions_read on public.creator_protocol_constitutions
for select to authenticated using (true);

drop policy if exists cpc_memberships_access on public.creator_protocol_compact_memberships;
create policy cpc_memberships_access on public.creator_protocol_compact_memberships
for all to authenticated using (applicant_user_id = (select auth.uid()))
with check (applicant_user_id = (select auth.uid()));

drop policy if exists cpc_provisions_read on public.creator_protocol_provisions;
create policy cpc_provisions_read on public.creator_protocol_provisions
for select to authenticated using (true);

drop policy if exists cpc_constitutions_service on public.creator_protocol_constitutions;
create policy cpc_constitutions_service on public.creator_protocol_constitutions for all to service_role using (true) with check (true);
drop policy if exists cpc_memberships_service on public.creator_protocol_compact_memberships;
create policy cpc_memberships_service on public.creator_protocol_compact_memberships for all to service_role using (true) with check (true);
drop policy if exists cpc_provisions_service on public.creator_protocol_provisions;
create policy cpc_provisions_service on public.creator_protocol_provisions for all to service_role using (true) with check (true);

comment on table public.creator_protocol_compact_memberships is 'Explicit compact ratification; never implied by Tourify or Phase 12 commons participation.';

commit;
