-- REFERENCE OUTLINE ONLY.

create table if not exists public.creator_commons_operators (
  id uuid primary key default gen_random_uuid(),
  legal_entity_party_id uuid,
  service_scopes jsonb not null default '[]'::jsonb,
  status text not null default 'applicant',
  jurisdiction_profiles jsonb not null default '[]'::jsonb,
  conformance_expires_at timestamptz,
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_conformance_results (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.creator_commons_operators(id),
  implementation_id text not null,
  profile_id text not null,
  profile_version text not null,
  status text not null,
  evidence_manifest_id uuid,
  tested_at timestamptz not null,
  expires_at timestamptz,
  unique(implementation_id, profile_id, profile_version, tested_at)
);

create table if not exists public.creator_commons_transition_packages (
  id uuid primary key default gen_random_uuid(),
  provider_party_id uuid,
  package_version text not null,
  status text not null default 'draft',
  manifest_hash text,
  escrow_verified_at timestamptz,
  release_conditions jsonb not null default '{}'::jsonb,
  policy_version text not null,
  unique(provider_party_id, package_version)
);

create table if not exists public.creator_commons_funding_sources (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id),
  source_party_id uuid,
  amount_minor bigint not null,
  currency text not null,
  restricted boolean not null default false,
  related_party boolean not null default false,
  period_start date,
  period_end date
);

alter table public.creator_commons_operators enable row level security;
alter table public.creator_commons_conformance_results enable row level security;
alter table public.creator_commons_transition_packages enable row level security;
alter table public.creator_commons_funding_sources enable row level security;
