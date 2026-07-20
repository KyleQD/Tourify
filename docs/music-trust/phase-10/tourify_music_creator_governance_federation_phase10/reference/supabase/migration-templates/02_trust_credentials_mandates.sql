-- REFERENCE OUTLINE ONLY. Never deploy without credential, key and RLS review.

create table if not exists public.creator_federation_trusted_issuers (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id),
  issuer_identifier text not null,
  approved_profiles jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_credentials (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.creator_federation_trusted_issuers(id),
  subject_ref text not null,
  credential_type text not null,
  schema_version text not null,
  status text not null default 'active',
  issued_at timestamptz not null,
  expires_at timestamptz,
  source_record_type text not null,
  source_record_id uuid not null,
  credential_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_mandates (
  id uuid primary key default gen_random_uuid(),
  principal_organization_id uuid not null,
  federation_entity_id uuid not null references public.creator_federation_entities(id),
  service_key text not null,
  scope jsonb not null,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  supersedes_id uuid references public.creator_federation_mandates(id),
  created_at timestamptz not null default now()
);
