-- Phase 12 S3–S4: protocol commons, registries, minimized projections.

begin;

create table if not exists public.creator_commons_protocols (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'proposal', 'review', 'approved', 'sandbox', 'deprecated', 'withdrawn'
  )),
  current_version text,
  governance_policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_protocol_versions (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.creator_commons_protocols(id) on delete cascade,
  version text not null,
  status text not null default 'proposal' check (status in (
    'proposal', 'review', 'approved', 'effective', 'deprecated', 'withdrawn'
  )),
  specification_hash text not null,
  compatibility_manifest jsonb not null default '{}'::jsonb,
  effective_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(protocol_id, version)
);

create table if not exists public.creator_commons_registries (
  id uuid primary key default gen_random_uuid(),
  registry_kind text not null,
  operator_id uuid,
  status text not null default 'sandbox' check (status in (
    'sandbox', 'active', 'suspended', 'retired'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_registry_entries (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.creator_commons_registries(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  source_version text not null,
  status text not null default 'submitted' check (status in (
    'submitted', 'active', 'suspended', 'disputed', 'revoked'
  )),
  public_projection jsonb not null default '{}'::jsonb,
  source_fresh_at timestamptz,
  disputed boolean not null default false,
  revoked boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(registry_id, source_type, source_id, source_version)
);

alter table public.creator_commons_protocols enable row level security;
alter table public.creator_commons_protocol_versions enable row level security;
alter table public.creator_commons_registries enable row level security;
alter table public.creator_commons_registry_entries enable row level security;

revoke all on
  public.creator_commons_protocols,
  public.creator_commons_protocol_versions,
  public.creator_commons_registries,
  public.creator_commons_registry_entries
from anon, authenticated;

grant select on public.creator_commons_protocols to authenticated;
grant select on public.creator_commons_protocol_versions to authenticated;
grant select on public.creator_commons_registries to authenticated;
grant select on public.creator_commons_registry_entries to authenticated;

grant all on
  public.creator_commons_protocols,
  public.creator_commons_protocol_versions,
  public.creator_commons_registries,
  public.creator_commons_registry_entries
to service_role;

drop policy if exists cc_protocols_read on public.creator_commons_protocols;
create policy cc_protocols_read on public.creator_commons_protocols for select to authenticated using (true);
drop policy if exists cc_protocol_versions_read on public.creator_commons_protocol_versions;
create policy cc_protocol_versions_read on public.creator_commons_protocol_versions for select to authenticated using (true);
drop policy if exists cc_registries_read on public.creator_commons_registries;
create policy cc_registries_read on public.creator_commons_registries for select to authenticated using (true);
drop policy if exists cc_registry_entries_read on public.creator_commons_registry_entries;
create policy cc_registry_entries_read on public.creator_commons_registry_entries for select to authenticated using (true);

drop policy if exists cc_protocols_service on public.creator_commons_protocols;
create policy cc_protocols_service on public.creator_commons_protocols for all to service_role using (true) with check (true);
drop policy if exists cc_protocol_versions_service on public.creator_commons_protocol_versions;
create policy cc_protocol_versions_service on public.creator_commons_protocol_versions for all to service_role using (true) with check (true);
drop policy if exists cc_registries_service on public.creator_commons_registries;
create policy cc_registries_service on public.creator_commons_registries for all to service_role using (true) with check (true);
drop policy if exists cc_registry_entries_service on public.creator_commons_registry_entries;
create policy cc_registry_entries_service on public.creator_commons_registry_entries for all to service_role using (true) with check (true);

comment on table public.creator_commons_registry_entries is 'Sandbox registry projections only; never query confidential Phase 1–11 operational tables from public routes.';

commit;
