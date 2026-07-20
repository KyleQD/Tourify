-- REFERENCE ONLY: create actual migration with `supabase migration new` after audit.
create table if not exists public.music_rights_admin_mandates (
 id uuid primary key default gen_random_uuid(), principal_party_id uuid not null, representative_party_id uuid, status text not null, scope jsonb not null, version integer not null default 1, starts_at timestamptz not null, ends_at timestamptz, agreement_version_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.music_rights_admin_cases (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null, organization_id uuid, case_type text not null, mandate_id uuid references public.music_rights_admin_mandates(id), subject_type text not null, subject_id uuid not null, status text not null default 'draft', version integer not null default 1, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.music_rights_admin_mandates enable row level security;
alter table public.music_rights_admin_cases enable row level security;
-- Policies must be created from audited ownership/capability functions.
