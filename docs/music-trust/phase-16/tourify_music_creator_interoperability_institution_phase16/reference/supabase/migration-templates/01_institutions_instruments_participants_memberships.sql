-- REFERENCE ONLY. Convert after auditing deployed Supabase schema.
create table if not exists public.creator_interop_institutions (
  id uuid primary key default gen_random_uuid(), legal_character text not null, lifecycle_state text not null default 'draft',
  policy_version text not null, schema_version text not null, jurisdiction text not null,
  source_manifest_id uuid, effective_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_instruments (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
  instrument_type text not null, lifecycle_state text not null, authentic_languages text[] not null default '{}',
  policy_version text not null, schema_version text not null, source_manifest_id uuid, effective_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_participants (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
  participant_class text not null, authority_state text not null default 'draft', jurisdiction text not null,
  authority_evidence_ids uuid[] not null default '{}', effective_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
-- Enable RLS and create exact participant, organ, reviewer and worker policies after capability audit.
