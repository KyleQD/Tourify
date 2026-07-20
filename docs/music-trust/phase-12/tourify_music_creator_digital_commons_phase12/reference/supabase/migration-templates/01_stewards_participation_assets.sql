-- REFERENCE OUTLINE ONLY. Create the real migration with the installed Supabase CLI after auditing deployed types.

create table if not exists public.creator_commons_stewards (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  jurisdiction text,
  status text not null default 'draft',
  charter_version text,
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_participations (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid not null references public.creator_commons_stewards(id),
  participant_user_id uuid, -- AUDIT actual auth/profile ID type and FK
  participant_organization_id uuid, -- AUDIT organization source
  status text not null default 'applied',
  scopes jsonb not null default '[]'::jsonb,
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((participant_user_id is not null) <> (participant_organization_id is not null))
);

create table if not exists public.creator_commons_assets (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id),
  asset_kind text not null,
  display_name text not null,
  legal_owner_party_id uuid,
  custodian_party_id uuid,
  operator_party_id uuid,
  transfer_status text not null default 'unreviewed',
  evidence_manifest_id uuid,
  public_projection jsonb not null default '{}'::jsonb,
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_commons_stewards enable row level security;
alter table public.creator_commons_participations enable row level security;
alter table public.creator_commons_assets enable row level security;

-- Add exact policies only after auditing existing capability helpers.
