-- REFERENCE OUTLINE ONLY. Audit deployed types and create the real migration with Supabase CLI.
create table if not exists public.creator_protocol_constitutions (
 id uuid primary key default gen_random_uuid(), legal_entity_id uuid, status text not null default 'draft', charter_version text not null, policy_version text not null, jurisdiction text, effective_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.creator_protocol_compact_memberships (
 id uuid primary key default gen_random_uuid(), constitution_id uuid not null references public.creator_protocol_constitutions(id), organization_id uuid not null, status text not null default 'applied', ratification_instrument_path text, reservations jsonb not null default '[]'::jsonb, effective_at timestamptz, withdrawal_at timestamptz, policy_version text not null, created_at timestamptz not null default now());
create table if not exists public.creator_protocol_provisions (
 id uuid primary key default gen_random_uuid(), constitution_id uuid not null references public.creator_protocol_constitutions(id), provision_key text not null, provision_class text not null, text_hash text not null, version text not null, effective_at timestamptz not null, supersedes_id uuid references public.creator_protocol_provisions(id), created_at timestamptz not null default now(), unique(constitution_id,provision_key,version));
alter table public.creator_protocol_constitutions enable row level security;
alter table public.creator_protocol_compact_memberships enable row level security;
alter table public.creator_protocol_provisions enable row level security;
-- Add exact policies only after auditing capability helpers and organization IDs.
