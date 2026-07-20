-- REFERENCE OUTLINE ONLY. Validate privacy, localization and organization types.

create table if not exists public.creator_federation_transfer_manifests (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null,
  destination_organization_id uuid not null,
  purpose_key text not null,
  jurisdictions jsonb not null,
  transfer_mechanism text,
  lineage_manifest_hash text not null,
  status text not null default 'draft',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_service_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_key text not null,
  endpoint_url text not null,
  supported_profiles jsonb not null default '[]'::jsonb,
  jurisdictions jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  metadata_signature text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_conformance_results (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  profile_version text not null,
  result text not null,
  evidence jsonb not null default '{}'::jsonb,
  tested_at timestamptz not null,
  expires_at timestamptz
);
