-- REFERENCE ONLY. Create production migration with installed Supabase CLI after audit.
create table if not exists public.creator_cooperative_entities (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null, jurisdiction text not null, entity_type text not null,
  readiness_status text not null default 'concept', governing_document_version text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.creator_cooperative_members (
  id uuid primary key default gen_random_uuid(), entity_id uuid not null references public.creator_cooperative_entities(id),
  user_id uuid not null, membership_class text not null, status text not null,
  governing_document_version text not null, joined_at timestamptz, withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.creator_cooperative_votes (
  id uuid primary key default gen_random_uuid(), entity_id uuid not null references public.creator_cooperative_entities(id),
  proposal_id uuid not null, voter_member_id uuid not null references public.creator_cooperative_members(id),
  encrypted_ballot jsonb not null, cast_at timestamptz not null default now(), unique(proposal_id, voter_member_id)
);
alter table public.creator_cooperative_entities enable row level security;
alter table public.creator_cooperative_members enable row level security;
alter table public.creator_cooperative_votes enable row level security;
