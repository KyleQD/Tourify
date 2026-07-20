-- REFERENCE ONLY. Public API routes should read approved projections, never confidential operational tables.

create table if not exists public.creator_public_protocol_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  version text not null,
  status text not null default 'draft',
  specification_uri text not null,
  ipr_policy_uri text,
  released_at timestamptz,
  deprecated_at timestamptz,
  unique(profile_key, version)
);

create table if not exists public.creator_public_service_directory (
  id uuid primary key default gen_random_uuid(),
  organization_identifier text not null,
  capability text not null,
  endpoint_uri text not null,
  jurisdictions text[] not null default '{}',
  status text not null default 'pending',
  policy_version text not null,
  health_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_conformance_runs (
  id uuid primary key default gen_random_uuid(),
  subject_identifier text not null,
  profile_id uuid not null references public.creator_public_protocol_profiles(id),
  status text not null default 'queued',
  evidence_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.creator_public_protocol_profiles enable row level security;
alter table public.creator_public_service_directory enable row level security;
alter table public.creator_public_conformance_runs enable row level security;
