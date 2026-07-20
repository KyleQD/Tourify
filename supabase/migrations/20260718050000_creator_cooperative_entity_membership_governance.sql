-- Phase 9 S0–S2: entity readiness, membership, governance votes, flags.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_cooperative_entities (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  legal_name text not null,
  jurisdiction text not null,
  entity_type text not null default 'proposed_cooperative',
  readiness_status text not null default 'concept' check (readiness_status in (
    'concept', 'counsel_pending', 'documents_draft', 'board_pending', 'ready', 'launched', 'suspended'
  )),
  governing_document_version text,
  production_authority boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_cooperative_members (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_cooperative_entities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_class text not null default 'applicant',
  status text not null default 'draft' check (status in (
    'draft', 'applied', 'under_review', 'approved', 'active', 'suspended', 'withdrawn', 'expelled'
  )),
  governing_document_version text not null default 'draft',
  application_notes text,
  joined_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (entity_id, user_id)
);

create table if not exists public.creator_cooperative_proposals (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_cooperative_entities(id) on delete cascade,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'closed', 'withdrawn', 'blocked'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_cooperative_votes (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_cooperative_entities(id) on delete cascade,
  proposal_id uuid not null references public.creator_cooperative_proposals(id) on delete cascade,
  voter_member_id uuid not null references public.creator_cooperative_members(id) on delete cascade,
  encrypted_ballot jsonb not null default '{}'::jsonb,
  cast_at timestamptz not null default now(),
  unique (proposal_id, voter_member_id)
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_cooperative_readiness_enabled', 'Cooperative readiness', 'Education and readiness hub.', false, 0),
  ('creator_cooperative_membership_enabled', 'Cooperative membership', 'Membership applications.', false, 0),
  ('creator_data_contribution_enabled', 'Data contribution', 'Contribution licences.', false, 0),
  ('creator_data_vault_enabled', 'Data vault', 'Vault metadata access.', false, 0),
  ('research_exchange_private_beta_enabled', 'Research exchange', 'Research applications private beta.', false, 0),
  ('research_clean_room_enabled', 'Research clean room', 'Clean-room research access.', false, 0),
  ('external_research_licensing_enabled', 'External research licensing', 'Separately gated; default deny.', false, 0),
  ('member_benefit_allocation_enabled', 'Member benefits', 'Separately gated; default deny.', false, 0),
  ('policy_observatory_enabled', 'Policy observatory', 'Sourced policy observatory.', false, 0),
  ('standards_participation_workspace_enabled', 'Standards workspace', 'Standards participation stubs.', false, 0),
  ('public_policy_submission_enabled', 'Public policy submission', 'Separately gated; default deny.', false, 0),
  ('collective_entity_readiness_enabled', 'Collective readiness', 'Collective entity readiness records.', false, 0),
  ('collective_representation_enabled', 'Collective representation', 'Separately gated; default deny.', false, 0),
  ('cross_border_research_enabled', 'Cross-border research', 'Separately gated; default deny.', false, 0),
  ('cooperative_token_or_transfer_enabled', 'Token/transfer membership', 'Separately gated; default deny.', false, 0),
  ('creator_cooperative_admin_ops_enabled', 'Cooperative admin ops', 'Ops kill switches.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.creator_cooperative_entities enable row level security;
alter table public.creator_cooperative_members enable row level security;
alter table public.creator_cooperative_proposals enable row level security;
alter table public.creator_cooperative_votes enable row level security;

revoke all on
  public.creator_cooperative_entities,
  public.creator_cooperative_members,
  public.creator_cooperative_proposals,
  public.creator_cooperative_votes
from anon, authenticated;

grant select on public.creator_cooperative_entities to authenticated;
grant select, insert, update on public.creator_cooperative_members to authenticated;
grant select on public.creator_cooperative_proposals to authenticated;
grant select, insert on public.creator_cooperative_votes to authenticated;

grant all on
  public.creator_cooperative_entities,
  public.creator_cooperative_members,
  public.creator_cooperative_proposals,
  public.creator_cooperative_votes
to service_role;

drop policy if exists cc_entities_read on public.creator_cooperative_entities;
create policy cc_entities_read on public.creator_cooperative_entities
for select to authenticated using (true);

drop policy if exists cc_members_access on public.creator_cooperative_members;
create policy cc_members_access on public.creator_cooperative_members
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists cc_proposals_read on public.creator_cooperative_proposals;
create policy cc_proposals_read on public.creator_cooperative_proposals
for select to authenticated using (exists (
  select 1 from public.creator_cooperative_members m
  where m.entity_id = entity_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists cc_votes_access on public.creator_cooperative_votes;
create policy cc_votes_access on public.creator_cooperative_votes
for all to authenticated using (exists (
  select 1 from public.creator_cooperative_members m
  where m.id = voter_member_id and m.user_id = (select auth.uid())
)) with check (true);

drop policy if exists cc_entities_service on public.creator_cooperative_entities;
create policy cc_entities_service on public.creator_cooperative_entities for all to service_role using (true) with check (true);
drop policy if exists cc_members_service on public.creator_cooperative_members;
create policy cc_members_service on public.creator_cooperative_members for all to service_role using (true) with check (true);
drop policy if exists cc_proposals_service on public.creator_cooperative_proposals;
create policy cc_proposals_service on public.creator_cooperative_proposals for all to service_role using (true) with check (true);
drop policy if exists cc_votes_service on public.creator_cooperative_votes;
create policy cc_votes_service on public.creator_cooperative_votes for all to service_role using (true) with check (true);

comment on table public.creator_cooperative_members is 'Separate from Tourify account state; never implied by Phase 8 consent.';

commit;
