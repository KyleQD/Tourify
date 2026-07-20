-- REFERENCE ONLY. Create the production migration with `supabase migration new` after auditing deployed types.

create table if not exists public.creator_public_infrastructure_entities (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  entity_kind text not null,
  status text not null default 'draft',
  jurisdiction text,
  governance_policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_public_infrastructure_participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  organization_id uuid,
  entity_id uuid not null references public.creator_public_infrastructure_entities(id),
  status text not null default 'draft',
  terms_version text not null,
  activated_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_identifiers (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.creator_public_infrastructure_participations(id),
  public_identifier text not null unique,
  method text not null,
  status text not null default 'active',
  document_json jsonb not null default '{}'::jsonb,
  controller_version integer not null default 1,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);

alter table public.creator_public_infrastructure_entities enable row level security;
alter table public.creator_public_infrastructure_participations enable row level security;
alter table public.creator_public_identifiers enable row level security;
