-- REFERENCE ONLY.
create table if not exists public.music_enforcement_observations (id uuid primary key default gen_random_uuid(), owner_user_id uuid not null, source_url text, capture_path text, capture_sha256 text, candidate_asset_id uuid, confidence numeric, triage_status text not null default 'new', created_at timestamptz not null default now());
create table if not exists public.music_dmca_cases (id uuid primary key default gen_random_uuid(), direction text not null, notice_version jsonb not null, status text not null, material_locations jsonb not null default '[]'::jsonb, disabled_at timestamptz, counter_received_at timestamptz, restore_earliest_at timestamptz, restore_latest_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.music_rights_settlements (id uuid primary key default gen_random_uuid(), case_id uuid references public.music_rights_admin_cases(id), agreement_version_id uuid, status text not null, gross_minor bigint, currency text, terms jsonb not null, created_at timestamptz not null default now());
alter table public.music_enforcement_observations enable row level security;
alter table public.music_dmca_cases enable row level security;
alter table public.music_rights_settlements enable row level security;
