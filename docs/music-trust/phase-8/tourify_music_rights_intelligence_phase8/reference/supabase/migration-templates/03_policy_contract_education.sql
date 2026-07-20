-- REFERENCE ONLY.
create table if not exists public.intelligence_policy_sources (
  id uuid primary key default gen_random_uuid(), source_url text not null, jurisdiction text, authority_level text not null,
  published_at timestamptz, effective_at timestamptz, retrieved_at timestamptz not null, content_hash text not null
);
create table if not exists public.intelligence_policy_versions (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.intelligence_policy_sources(id),
  summary text not null, affected_domains jsonb not null default '[]'::jsonb, review_by timestamptz not null,
  status text not null, supersedes_id uuid references public.intelligence_policy_versions(id), created_at timestamptz not null default now()
);
create table if not exists public.intelligence_contract_term_observations (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id),
  agreement_version_id uuid, category text not null, normalized_value jsonb not null,
  confidence numeric not null, human_confirmed boolean not null default false,
  permitted_for_aggregate boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.intelligence_education_alerts (
  id uuid primary key default gen_random_uuid(), policy_version_id uuid references public.intelligence_policy_versions(id),
  audience_policy jsonb not null, content jsonb not null, status text not null, published_at timestamptz
);
alter table public.intelligence_contract_term_observations enable row level security;
