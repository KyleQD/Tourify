-- REFERENCE ONLY. Validate IDs, role functions, grants and retention before production.
create table if not exists public.creator_data_contribution_licenses (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.creator_cooperative_members(id),
  status text not null, version integer not null default 1, permitted_purposes text[] not null default '{}',
  prohibited_purposes text[] not null default '{}', data_categories text[] not null default '{}', source_ids text[] not null default '{}',
  recipient_ids text[] not null default '{}', ai_training_allowed boolean not null default false,
  commercial_research_allowed boolean not null default false, starts_at timestamptz not null, ends_at timestamptz,
  accepted_at timestamptz, revoked_at timestamptz, document_hash text not null
);
create table if not exists public.creator_data_source_manifests (
  id uuid primary key default gen_random_uuid(), source_type text not null, source_record_id text not null,
  snapshot_hash text not null, permission_manifest jsonb not null, quality_manifest jsonb not null,
  captured_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.creator_data_transformation_runs (
  id uuid primary key default gen_random_uuid(), input_manifest_ids uuid[] not null, transformation_version text not null,
  output_hash text, status text not null, started_at timestamptz, completed_at timestamptz, error text
);
alter table public.creator_data_contribution_licenses enable row level security;
alter table public.creator_data_source_manifests enable row level security;
alter table public.creator_data_transformation_runs enable row level security;
