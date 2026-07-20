-- REFERENCE ONLY. External researchers must never receive broad table access.
create table if not exists public.creator_research_projects (
  id uuid primary key default gen_random_uuid(), applicant_entity_id uuid not null, purpose text not null,
  classification text not null, status text not null, protocol_version text not null,
  ethics_status text not null default 'pending', privacy_status text not null default 'pending',
  competition_status text not null default 'pending', security_status text not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.creator_research_licenses (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.creator_research_projects(id),
  status text not null, data_product_ids uuid[] not null default '{}', permitted_analyses jsonb not null,
  output_policy jsonb not null, starts_at timestamptz not null, ends_at timestamptz, document_hash text not null
);
create table if not exists public.creator_research_outputs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.creator_research_projects(id),
  version integer not null default 1, status text not null, artifact_path text, artifact_hash text,
  privacy_review jsonb, competition_review jsonb, editorial_review jsonb, published_at timestamptz
);
alter table public.creator_research_projects enable row level security;
alter table public.creator_research_licenses enable row level security;
alter table public.creator_research_outputs enable row level security;
