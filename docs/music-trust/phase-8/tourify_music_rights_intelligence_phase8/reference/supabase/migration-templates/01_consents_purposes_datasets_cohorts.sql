-- REFERENCE ONLY. Create a real migration with the installed Supabase CLI after audit.
create table if not exists public.intelligence_purposes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  purpose_id uuid not null references public.intelligence_purposes(id),
  version text not null,
  data_categories jsonb not null default '[]'::jsonb,
  output_classes jsonb not null default '[]'::jsonb,
  status text not null check (status in ('draft','presented','accepted','active','partially_withdrawn','expired','revoked')),
  effective_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  purpose_id uuid not null references public.intelligence_purposes(id),
  source_manifest jsonb not null,
  consent_snapshot_hash text not null,
  quality_status text not null, privacy_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_cohorts (
  id uuid primary key default gen_random_uuid(),
  code text not null, version integer not null, definition jsonb not null,
  threshold_policy jsonb not null, status text not null,
  created_at timestamptz not null default now(), unique(code, version)
);

alter table public.intelligence_consents enable row level security;
-- Add audited owner/admin policies. Never grant participant access to peer rows.
