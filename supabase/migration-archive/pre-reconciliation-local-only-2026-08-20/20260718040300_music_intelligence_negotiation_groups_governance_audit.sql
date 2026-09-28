-- Phase 8 S7–S12: negotiation readiness groups, clean rooms, audit, outbox.

begin;

create table if not exists public.music_intelligence_negotiation_groups (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  group_type text not null default 'readiness',
  purpose text not null default 'negotiation_readiness',
  jurisdiction_policy jsonb not null default '{}'::jsonb,
  legal_status text not null default 'educational' check (legal_status in (
    'educational', 'simulation', 'counsel_pending', 'separately_authorized'
  )),
  state text not null default 'readiness_only' check (state in (
    'proposed', 'legal_review', 'readiness_only', 'approved_for_simulation',
    'separately_authorized', 'active', 'suspended', 'dissolved'
  )),
  external_action_enabled boolean not null default false,
  counsel_approval_ref text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_negotiation_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.music_intelligence_negotiation_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in (
    'invited', 'active', 'exited', 'removed'
  )),
  joined_at timestamptz,
  exited_at timestamptz,
  unique (group_id, user_id)
);

create table if not exists public.music_intelligence_negotiation_proposals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.music_intelligence_negotiation_groups(id) on delete cascade,
  proposal_class text not null default 'education',
  body jsonb not null default '{}'::jsonb,
  topic_screen jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'screened', 'blocked', 'open', 'closed', 'withdrawn'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_negotiation_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.music_intelligence_negotiation_proposals(id) on delete cascade,
  membership_id uuid not null references public.music_intelligence_negotiation_memberships(id) on delete cascade,
  encrypted_choice text not null,
  cast_at timestamptz not null default now(),
  unique (proposal_id, membership_id)
);

create table if not exists public.music_intelligence_clean_room_queries (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  purpose_id uuid references public.music_intelligence_purposes(id) on delete set null,
  requested_columns text[] not null default '{}',
  status text not null default 'denied' check (status in (
    'denied', 'approved', 'executed', 'failed'
  )),
  deny_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique not null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'delivered', 'failed', 'dead'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists music_intelligence_outbox_pending_idx
  on public.music_intelligence_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('music-intelligence-datasets', 'music-intelligence-datasets', false, 104857600),
  ('music-intelligence-clean-room', 'music-intelligence-clean-room', false, 104857600),
  ('music-intelligence-evidence', 'music-intelligence-evidence', false, 52428800)
on conflict (id) do nothing;

alter table public.music_intelligence_negotiation_groups enable row level security;
alter table public.music_intelligence_negotiation_memberships enable row level security;
alter table public.music_intelligence_negotiation_proposals enable row level security;
alter table public.music_intelligence_negotiation_votes enable row level security;
alter table public.music_intelligence_clean_room_queries enable row level security;
alter table public.music_intelligence_audit_events enable row level security;
alter table public.music_intelligence_outbox enable row level security;

revoke all on
  public.music_intelligence_negotiation_groups,
  public.music_intelligence_negotiation_memberships,
  public.music_intelligence_negotiation_proposals,
  public.music_intelligence_negotiation_votes,
  public.music_intelligence_clean_room_queries,
  public.music_intelligence_audit_events,
  public.music_intelligence_outbox
from anon, authenticated;

grant select, insert, update on public.music_intelligence_negotiation_groups to authenticated;
grant select, insert, update on public.music_intelligence_negotiation_memberships to authenticated;
grant select, insert on public.music_intelligence_negotiation_proposals to authenticated;
grant select, insert on public.music_intelligence_negotiation_votes to authenticated;
grant select, insert on public.music_intelligence_clean_room_queries to authenticated;

grant all on
  public.music_intelligence_negotiation_groups,
  public.music_intelligence_negotiation_memberships,
  public.music_intelligence_negotiation_proposals,
  public.music_intelligence_negotiation_votes,
  public.music_intelligence_clean_room_queries,
  public.music_intelligence_audit_events,
  public.music_intelligence_outbox
to service_role;

drop policy if exists mi_groups_access on public.music_intelligence_negotiation_groups;
create policy mi_groups_access on public.music_intelligence_negotiation_groups
for all to authenticated using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.music_intelligence_negotiation_memberships m
    where m.group_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
) with check (created_by = (select auth.uid()) and external_action_enabled = false);

drop policy if exists mi_memberships_access on public.music_intelligence_negotiation_memberships;
create policy mi_memberships_access on public.music_intelligence_negotiation_memberships
for all to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.music_intelligence_negotiation_groups g
    where g.id = group_id and g.created_by = (select auth.uid())
  )
) with check (true);

drop policy if exists mi_proposals_access on public.music_intelligence_negotiation_proposals;
create policy mi_proposals_access on public.music_intelligence_negotiation_proposals
for all to authenticated using (exists (
  select 1 from public.music_intelligence_negotiation_memberships m
  where m.group_id = group_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_votes_access on public.music_intelligence_negotiation_votes;
create policy mi_votes_access on public.music_intelligence_negotiation_votes
for all to authenticated using (exists (
  select 1 from public.music_intelligence_negotiation_memberships m
  where m.id = membership_id and m.user_id = (select auth.uid())
)) with check (true);

drop policy if exists mi_clean_room_access on public.music_intelligence_clean_room_queries;
create policy mi_clean_room_access on public.music_intelligence_clean_room_queries
for all to authenticated using (requester_user_id = (select auth.uid()))
with check (requester_user_id = (select auth.uid()));

drop policy if exists mi_groups_service on public.music_intelligence_negotiation_groups;
create policy mi_groups_service on public.music_intelligence_negotiation_groups for all to service_role using (true) with check (true);
drop policy if exists mi_memberships_service on public.music_intelligence_negotiation_memberships;
create policy mi_memberships_service on public.music_intelligence_negotiation_memberships for all to service_role using (true) with check (true);
drop policy if exists mi_proposals_service on public.music_intelligence_negotiation_proposals;
create policy mi_proposals_service on public.music_intelligence_negotiation_proposals for all to service_role using (true) with check (true);
drop policy if exists mi_votes_service on public.music_intelligence_negotiation_votes;
create policy mi_votes_service on public.music_intelligence_negotiation_votes for all to service_role using (true) with check (true);
drop policy if exists mi_clean_room_service on public.music_intelligence_clean_room_queries;
create policy mi_clean_room_service on public.music_intelligence_clean_room_queries for all to service_role using (true) with check (true);
drop policy if exists mi_audit_service on public.music_intelligence_audit_events;
create policy mi_audit_service on public.music_intelligence_audit_events for all to service_role using (true) with check (true);
drop policy if exists mi_outbox_service on public.music_intelligence_outbox;
create policy mi_outbox_service on public.music_intelligence_outbox for all to service_role using (true) with check (true);

comment on table public.music_intelligence_negotiation_groups is 'Readiness-only by default; external_action_enabled must stay false without counsel/entity approval.';

commit;
