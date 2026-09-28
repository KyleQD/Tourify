-- Phase 13 S8–S9: constitutional assets, operators, forks, succession.

begin;

create table if not exists public.creator_protocol_constitutional_assets (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  asset_kind text not null check (asset_kind in (
    'domain', 'trademark', 'repository', 'package_namespace', 'schema_uri',
    'signing_key', 'cloud_account', 'documentation', 'other'
  )),
  display_name text not null,
  legal_owner_id uuid,
  custodian_id uuid,
  operator_id uuid,
  classification text not null default 'restricted' check (classification in (
    'transferable', 'restricted', 'escrowed', 'public_trust', 'inalienable'
  )),
  status text not null default 'inventoried' check (status in (
    'inventoried', 'escrow_pending', 'escrowed', 'disputed', 'retired'
  )),
  evidence_manifest_id uuid,
  public_projection jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_operators (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  organization_id uuid not null,
  display_name text not null default '',
  operator_class text not null default 'sandbox' check (operator_class in (
    'sandbox', 'reference', 'production_candidate', 'production'
  )),
  status text not null default 'candidate' check (status in (
    'candidate', 'diligence', 'accredited', 'suspended', 'revoked', 'retired'
  )),
  accreditation_expires_at timestamptz,
  exit_package_manifest_id uuid,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_forks (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid references public.creator_protocol_constitutions(id) on delete set null,
  parent_protocol_version text not null,
  fork_protocol_version text not null,
  lineage_manifest_id text not null,
  namespace_status text not null default 'proposed' check (namespace_status in (
    'proposed', 'reserved', 'active', 'reunifying', 'retired'
  )),
  status text not null default 'proposed' check (status in (
    'proposed', 'legitimate', 'malicious_blocked', 'reunified', 'withdrawn'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_succession_cases (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  trigger text not null check (trigger in (
    'planned', 'incapacity', 'insolvency', 'capture', 'security_failure', 'fork'
  )),
  predecessor_id uuid,
  successor_candidate_id uuid,
  status text not null default 'opened' check (status in (
    'opened', 'drill', 'in_progress', 'completed', 'blocked', 'closed'
  )),
  continuity_manifest_id text,
  checklist jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_protocol_constitutional_assets enable row level security;
alter table public.creator_protocol_operators enable row level security;
alter table public.creator_protocol_forks enable row level security;
alter table public.creator_protocol_succession_cases enable row level security;

revoke all on
  public.creator_protocol_constitutional_assets,
  public.creator_protocol_operators,
  public.creator_protocol_forks,
  public.creator_protocol_succession_cases
from anon, authenticated;

grant select on public.creator_protocol_constitutional_assets to authenticated;
grant select on public.creator_protocol_operators to authenticated;
grant select on public.creator_protocol_forks to authenticated;
grant select on public.creator_protocol_succession_cases to authenticated;

grant all on
  public.creator_protocol_constitutional_assets,
  public.creator_protocol_operators,
  public.creator_protocol_forks,
  public.creator_protocol_succession_cases
to service_role;

drop policy if exists cpc_assets_read on public.creator_protocol_constitutional_assets;
create policy cpc_assets_read on public.creator_protocol_constitutional_assets for select to authenticated using (true);
drop policy if exists cpc_operators_read on public.creator_protocol_operators;
create policy cpc_operators_read on public.creator_protocol_operators for select to authenticated using (true);
drop policy if exists cpc_forks_read on public.creator_protocol_forks;
create policy cpc_forks_read on public.creator_protocol_forks for select to authenticated using (true);
drop policy if exists cpc_succession_read on public.creator_protocol_succession_cases;
create policy cpc_succession_read on public.creator_protocol_succession_cases for select to authenticated using (true);

drop policy if exists cpc_assets_service on public.creator_protocol_constitutional_assets;
create policy cpc_assets_service on public.creator_protocol_constitutional_assets for all to service_role using (true) with check (true);
drop policy if exists cpc_operators_service on public.creator_protocol_operators;
create policy cpc_operators_service on public.creator_protocol_operators for all to service_role using (true) with check (true);
drop policy if exists cpc_forks_service on public.creator_protocol_forks;
create policy cpc_forks_service on public.creator_protocol_forks for all to service_role using (true) with check (true);
drop policy if exists cpc_succession_service on public.creator_protocol_succession_cases;
create policy cpc_succession_service on public.creator_protocol_succession_cases for all to service_role using (true) with check (true);

comment on table public.creator_protocol_constitutional_assets is 'Asset schedule; irreversible transfer hard-disabled; inalienable classification blocks transfer.';

commit;
