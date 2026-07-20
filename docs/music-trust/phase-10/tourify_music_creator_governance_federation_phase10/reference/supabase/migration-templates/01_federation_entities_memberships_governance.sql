-- REFERENCE OUTLINE ONLY. Audit live types, functions, RLS and migration head first.

create table if not exists public.creator_federation_entities (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  jurisdiction text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_federation_memberships (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id),
  member_organization_id uuid not null, -- AUDIT actual organization FK
  status text not null,
  version integer not null default 1,
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (federation_entity_id, member_organization_id, version)
);

create table if not exists public.creator_federation_reserved_powers (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.creator_federation_memberships(id),
  power_key text not null,
  policy_version text not null,
  created_at timestamptz not null default now(),
  unique (membership_id, power_key, policy_version)
);

-- Enable RLS and add exact organization/capability policies after auditing Tourify helpers.
