-- REFERENCE ONLY. Trust and rights-reference objects must not replace Rights Passport or external official records.

create table if not exists public.creator_public_trust_registry_entries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_public_infrastructure_entities(id),
  subject_identifier text not null,
  role text not null,
  scopes text[] not null default '{}',
  jurisdictions text[] not null default '{}',
  status text not null default 'pending',
  policy_version text not null,
  recognized_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_credentials (
  id uuid primary key default gen_random_uuid(),
  issuer_registry_entry_id uuid not null references public.creator_public_trust_registry_entries(id),
  subject_identifier text not null,
  schema_uri text not null,
  status text not null default 'active',
  issued_at timestamptz not null,
  expires_at timestamptz,
  credential_hash text not null,
  source_record_type text not null,
  source_record_id text not null,
  source_record_version text not null
);

create table if not exists public.creator_public_rights_references (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  source_type text not null,
  source_id text not null,
  source_version text not null,
  public_scopes text[] not null default '{}',
  status text not null default 'active',
  disputed boolean not null default false,
  refreshed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.creator_public_trust_registry_entries enable row level security;
alter table public.creator_public_credentials enable row level security;
alter table public.creator_public_rights_references enable row level security;
