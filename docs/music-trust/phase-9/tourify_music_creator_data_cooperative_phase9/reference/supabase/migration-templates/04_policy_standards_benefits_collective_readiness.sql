-- REFERENCE ONLY. No collective external action is authorized by these readiness tables.
create table if not exists public.creator_policy_sources (
  id uuid primary key default gen_random_uuid(), jurisdiction text not null, source_url text not null,
  source_type text not null, status text not null, published_at timestamptz not null,
  reviewed_at timestamptz, review_by timestamptz not null, content_hash text not null
);
create table if not exists public.creator_standards_contributions (
  id uuid primary key default gen_random_uuid(), standards_body text not null, project_name text not null,
  state text not null, ipr_review_status text not null, board_approval_status text not null,
  submission_reference text, submitted_at timestamptz
);
create table if not exists public.creator_member_benefit_allocations (
  id uuid primary key default gen_random_uuid(), pool_id uuid not null, member_id uuid not null references public.creator_cooperative_members(id),
  amount_minor bigint not null, currency text not null, status text not null, basis_manifest jsonb not null
);
create table if not exists public.creator_collective_entity_readiness (
  id uuid primary key default gen_random_uuid(), entity_id uuid not null references public.creator_cooperative_entities(id),
  proposed_role text not null, jurisdiction text not null, state text not null,
  production_authority boolean not null default false, approval_manifest jsonb not null default '{}'::jsonb
);
alter table public.creator_policy_sources enable row level security;
alter table public.creator_standards_contributions enable row level security;
alter table public.creator_member_benefit_allocations enable row level security;
alter table public.creator_collective_entity_readiness enable row level security;
