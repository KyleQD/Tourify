-- REFERENCE OUTLINE ONLY.

create table if not exists public.creator_commons_protocols (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'draft',
  current_version text,
  governance_policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_protocol_versions (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.creator_commons_protocols(id),
  version text not null,
  status text not null default 'proposal',
  specification_hash text not null,
  compatibility_manifest jsonb not null default '{}'::jsonb,
  effective_at timestamptz,
  deprecated_at timestamptz,
  unique(protocol_id, version)
);

create table if not exists public.creator_commons_registries (
  id uuid primary key default gen_random_uuid(),
  registry_kind text not null,
  operator_id uuid,
  status text not null default 'sandbox',
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_registry_entries (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.creator_commons_registries(id),
  source_type text not null,
  source_id text not null,
  source_version text not null,
  status text not null default 'submitted',
  public_projection jsonb not null default '{}'::jsonb,
  source_fresh_at timestamptz,
  disputed boolean not null default false,
  revoked boolean not null default false,
  policy_version text not null,
  unique(registry_id, source_type, source_id, source_version)
);

alter table public.creator_commons_protocols enable row level security;
alter table public.creator_commons_protocol_versions enable row level security;
alter table public.creator_commons_registries enable row level security;
alter table public.creator_commons_registry_entries enable row level security;
