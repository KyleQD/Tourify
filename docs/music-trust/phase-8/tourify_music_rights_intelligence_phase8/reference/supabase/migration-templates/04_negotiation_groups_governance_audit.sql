-- REFERENCE ONLY. All external-action states must remain disabled until separate legal approval.
create table if not exists public.intelligence_negotiation_groups (
  id uuid primary key default gen_random_uuid(), group_type text not null, purpose text not null, jurisdiction_policy jsonb not null,
  legal_status text not null, state text not null, external_action_enabled boolean not null default false,
  counsel_approval_ref text, created_at timestamptz not null default now()
);
create table if not exists public.intelligence_negotiation_memberships (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.intelligence_negotiation_groups(id),
  user_id uuid not null references auth.users(id), status text not null, joined_at timestamptz, exited_at timestamptz,
  unique(group_id, user_id)
);
create table if not exists public.intelligence_negotiation_proposals (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.intelligence_negotiation_groups(id),
  proposal_class text not null, body jsonb not null, topic_screen jsonb not null, status text not null, created_at timestamptz not null default now()
);
create table if not exists public.intelligence_negotiation_votes (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.intelligence_negotiation_proposals(id),
  membership_id uuid not null references public.intelligence_negotiation_memberships(id), encrypted_choice text not null,
  cast_at timestamptz not null default now(), unique(proposal_id, membership_id)
);
create table if not exists public.intelligence_audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, subject_type text not null,
  subject_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.intelligence_negotiation_groups enable row level security;
alter table public.intelligence_negotiation_memberships enable row level security;
alter table public.intelligence_negotiation_proposals enable row level security;
alter table public.intelligence_negotiation_votes enable row level security;
