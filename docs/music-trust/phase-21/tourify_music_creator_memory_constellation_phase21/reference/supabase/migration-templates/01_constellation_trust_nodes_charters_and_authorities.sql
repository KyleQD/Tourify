-- REFERENCE ONLY. Generate a production migration after auditing deployed Supabase.
create table if not exists public.creator_memory_constellations (id uuid primary key default gen_random_uuid(), state text not null, charter_version text not null, policy_version text not null, schema_version text not null, created_at timestamptz not null default now());
create table if not exists public.creator_memory_constellation_trust_nodes (id uuid primary key default gen_random_uuid(), constellation_id uuid not null references public.creator_memory_constellations(id), trust_entity_ref uuid not null, state text not null, authority_manifest_id uuid, effective_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.creator_memory_constellation_cultural_authorities (id uuid primary key default gen_random_uuid(), trust_node_id uuid not null references public.creator_memory_constellation_trust_nodes(id), community_ref text not null, scope jsonb not null, reserved_powers jsonb not null default '{}'::jsonb, source_manifest_id uuid not null, state text not null, created_at timestamptz not null default now());
alter table public.creator_memory_constellations enable row level security;
alter table public.creator_memory_constellation_trust_nodes enable row level security;
alter table public.creator_memory_constellation_cultural_authorities enable row level security;
-- Add explicit default-deny policies after role and helper audit.
