-- Phase 11 S3–S4: trust registry, credentials, rights-reference projections (not Phase 1–10 SoT).

begin;

create table if not exists public.creator_public_trust_registry_entries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_public_infrastructure_entities(id) on delete cascade,
  subject_identifier text not null,
  role text not null default 'participant',
  scopes text[] not null default '{}',
  jurisdictions text[] not null default '{}',
  status text not null default 'pending' check (status in (
    'pending', 'recognized', 'suspended', 'revoked', 'expired'
  )),
  policy_version text not null default '1.0.0',
  recognized_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_credentials (
  id uuid primary key default gen_random_uuid(),
  issuer_registry_entry_id uuid not null references public.creator_public_trust_registry_entries(id) on delete restrict,
  subject_identifier text not null,
  schema_uri text not null,
  status text not null default 'active' check (status in (
    'active', 'suspended', 'revoked', 'expired'
  )),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  credential_hash text not null,
  source_record_type text not null,
  source_record_id text not null,
  source_record_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_rights_references (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  source_type text not null,
  source_id text not null,
  source_version text not null,
  public_scopes text[] not null default '{}',
  status text not null default 'active' check (status in (
    'active', 'suspended', 'disputed', 'expired'
  )),
  disputed boolean not null default false,
  refreshed_at timestamptz not null default now(),
  jurisdiction text,
  created_at timestamptz not null default now()
);

alter table public.creator_public_trust_registry_entries enable row level security;
alter table public.creator_public_credentials enable row level security;
alter table public.creator_public_rights_references enable row level security;

revoke all on
  public.creator_public_trust_registry_entries,
  public.creator_public_credentials,
  public.creator_public_rights_references
from anon, authenticated;

grant select on public.creator_public_trust_registry_entries to authenticated;
grant select on public.creator_public_credentials to authenticated;
grant select on public.creator_public_rights_references to authenticated;

grant all on
  public.creator_public_trust_registry_entries,
  public.creator_public_credentials,
  public.creator_public_rights_references
to service_role;

drop policy if exists cpi_trust_read on public.creator_public_trust_registry_entries;
create policy cpi_trust_read on public.creator_public_trust_registry_entries
for select to authenticated using (true);

drop policy if exists cpi_credentials_read on public.creator_public_credentials;
create policy cpi_credentials_read on public.creator_public_credentials
for select to authenticated using (true);

drop policy if exists cpi_rights_refs_read on public.creator_public_rights_references;
create policy cpi_rights_refs_read on public.creator_public_rights_references
for select to authenticated using (true);

drop policy if exists cpi_trust_service on public.creator_public_trust_registry_entries;
create policy cpi_trust_service on public.creator_public_trust_registry_entries for all to service_role using (true) with check (true);
drop policy if exists cpi_credentials_service on public.creator_public_credentials;
create policy cpi_credentials_service on public.creator_public_credentials for all to service_role using (true) with check (true);
drop policy if exists cpi_rights_refs_service on public.creator_public_rights_references;
create policy cpi_rights_refs_service on public.creator_public_rights_references for all to service_role using (true) with check (true);

comment on table public.creator_public_rights_references is 'Approved minimal projections only; never query confidential Phase 1–10 operational tables from public routes.';

commit;
