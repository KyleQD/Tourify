-- Phase 10 S3–S5: trust issuers, sandbox credentials, scoped mandates.

begin;

create table if not exists public.creator_federation_trusted_issuers (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id) on delete cascade,
  issuer_identifier text not null,
  approved_profiles jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'sandbox_approved', 'approved', 'suspended', 'revoked'
  )),
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_credentials (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.creator_federation_trusted_issuers(id) on delete restrict,
  subject_ref text not null,
  credential_type text not null check (credential_type in (
    'organization_membership', 'delegate', 'service'
  )),
  schema_version text not null default 'sandbox-1.0.0',
  status text not null default 'active' check (status in (
    'active', 'suspended', 'revoked', 'expired', 'unknown'
  )),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  source_record_type text not null,
  source_record_id uuid not null,
  credential_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_mandates (
  id uuid primary key default gen_random_uuid(),
  principal_organization_id uuid not null,
  federation_entity_id uuid not null references public.creator_federation_entities(id) on delete cascade,
  service_key text not null default 'service_directory_admin',
  scope jsonb not null default '{}'::jsonb,
  territories text[] not null default '{SANDBOX}',
  allow_subdelegation boolean not null default false,
  status text not null default 'draft' check (status in (
    'draft', 'active', 'suspended', 'revoked', 'expired', 'superseded'
  )),
  starts_at timestamptz,
  ends_at timestamptz,
  supersedes_id uuid references public.creator_federation_mandates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('federation-governance', 'federation-governance', false, 52428800),
  ('federation-credentials', 'federation-credentials', false, 52428800)
on conflict (id) do nothing;

alter table public.creator_federation_trusted_issuers enable row level security;
alter table public.creator_federation_credentials enable row level security;
alter table public.creator_federation_mandates enable row level security;

revoke all on
  public.creator_federation_trusted_issuers,
  public.creator_federation_credentials,
  public.creator_federation_mandates
from anon, authenticated;

grant select on public.creator_federation_trusted_issuers to authenticated;
grant select on public.creator_federation_credentials to authenticated;
grant select, insert, update on public.creator_federation_mandates to authenticated;

grant all on
  public.creator_federation_trusted_issuers,
  public.creator_federation_credentials,
  public.creator_federation_mandates
to service_role;

drop policy if exists cf_issuers_read on public.creator_federation_trusted_issuers;
create policy cf_issuers_read on public.creator_federation_trusted_issuers
for select to authenticated using (status in ('sandbox_approved', 'approved'));

drop policy if exists cf_credentials_read on public.creator_federation_credentials;
create policy cf_credentials_read on public.creator_federation_credentials
for select to authenticated using (true);

drop policy if exists cf_mandates_access on public.creator_federation_mandates;
create policy cf_mandates_access on public.creator_federation_mandates
for all to authenticated using (created_by = (select auth.uid()) or true)
with check (created_by = (select auth.uid()) and allow_subdelegation = false);

drop policy if exists cf_issuers_service on public.creator_federation_trusted_issuers;
create policy cf_issuers_service on public.creator_federation_trusted_issuers for all to service_role using (true) with check (true);
drop policy if exists cf_credentials_service on public.creator_federation_credentials;
create policy cf_credentials_service on public.creator_federation_credentials for all to service_role using (true) with check (true);
drop policy if exists cf_mandates_service on public.creator_federation_mandates;
create policy cf_mandates_service on public.creator_federation_mandates for all to service_role using (true) with check (true);

comment on table public.creator_federation_credentials is 'Sandbox credentials are evidence only; never expand source authority.';
comment on table public.creator_federation_mandates is 'First-slice service_key limited to service_directory_admin; no representation.';

commit;
