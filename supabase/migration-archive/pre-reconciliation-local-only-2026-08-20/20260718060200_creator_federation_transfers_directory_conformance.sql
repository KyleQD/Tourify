-- Phase 10 S7–S9: transfer assessments, private directory, conformance.

begin;

create table if not exists public.creator_federation_transfer_manifests (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null,
  destination_organization_id uuid not null,
  purpose_key text not null,
  jurisdictions jsonb not null default '[]'::jsonb,
  transfer_mechanism text,
  lineage_manifest_hash text not null,
  pools_data boolean not null default false,
  status text not null default 'draft' check (status in (
    'draft', 'assessment', 'approved', 'denied', 'revoked'
  )),
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cf_transfer_no_auto_pool check (pools_data = false)
);

create table if not exists public.creator_federation_service_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_key text not null,
  endpoint_url text not null,
  supported_profiles jsonb not null default '[]'::jsonb,
  jurisdictions jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'active', 'suspended', 'retired'
  )),
  is_public boolean not null default false,
  metadata_signature text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_conformance_results (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  profile_version text not null,
  result text not null check (result in (
    'pass', 'fail', 'partial', 'not_tested'
  )),
  evidence jsonb not null default '{}'::jsonb,
  tested_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.creator_federation_transfer_manifests enable row level security;
alter table public.creator_federation_service_endpoints enable row level security;
alter table public.creator_federation_conformance_results enable row level security;

revoke all on
  public.creator_federation_transfer_manifests,
  public.creator_federation_service_endpoints,
  public.creator_federation_conformance_results
from anon, authenticated;

grant select, insert on public.creator_federation_transfer_manifests to authenticated;
grant select on public.creator_federation_service_endpoints to authenticated;
grant select on public.creator_federation_conformance_results to authenticated;

grant all on
  public.creator_federation_transfer_manifests,
  public.creator_federation_service_endpoints,
  public.creator_federation_conformance_results
to service_role;

drop policy if exists cf_transfers_access on public.creator_federation_transfer_manifests;
create policy cf_transfers_access on public.creator_federation_transfer_manifests
for all to authenticated using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()) and pools_data = false);

drop policy if exists cf_endpoints_read on public.creator_federation_service_endpoints;
create policy cf_endpoints_read on public.creator_federation_service_endpoints
for select to authenticated using (is_public = false and status in ('active', 'pending'));

drop policy if exists cf_conformance_read on public.creator_federation_conformance_results;
create policy cf_conformance_read on public.creator_federation_conformance_results
for select to authenticated using (true);

drop policy if exists cf_transfers_service on public.creator_federation_transfer_manifests;
create policy cf_transfers_service on public.creator_federation_transfer_manifests for all to service_role using (true) with check (true);
drop policy if exists cf_endpoints_service on public.creator_federation_service_endpoints;
create policy cf_endpoints_service on public.creator_federation_service_endpoints for all to service_role using (true) with check (true);
drop policy if exists cf_conformance_service on public.creator_federation_conformance_results;
create policy cf_conformance_service on public.creator_federation_conformance_results for all to service_role using (true) with check (true);

comment on table public.creator_federation_transfer_manifests is 'Assessments only; pools_data must remain false — no automatic pooling.';

commit;
