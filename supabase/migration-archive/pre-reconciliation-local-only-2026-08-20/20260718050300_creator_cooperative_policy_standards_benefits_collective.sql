-- Phase 9 S7–S12: policy observatory, standards, benefits readiness, collective stubs, audit, outbox.

begin;

create table if not exists public.creator_policy_sources (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  source_url text not null,
  source_type text not null default 'secondary',
  status text not null default 'draft' check (status in (
    'draft', 'reviewed', 'published', 'stale', 'superseded', 'revoked'
  )),
  published_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_by timestamptz not null,
  content_hash text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_standards_contributions (
  id uuid primary key default gen_random_uuid(),
  standards_body text not null,
  project_name text not null,
  state text not null default 'draft' check (state in (
    'draft', 'internal_review', 'ipr_review', 'board_review', 'ready', 'submitted', 'withdrawn', 'blocked'
  )),
  ipr_review_status text not null default 'pending',
  board_approval_status text not null default 'pending',
  submission_reference text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_member_benefit_allocations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null,
  member_id uuid not null references public.creator_cooperative_members(id) on delete cascade,
  amount_minor bigint not null,
  currency text not null default 'USD',
  status text not null default 'draft' check (status in (
    'draft', 'ready', 'blocked', 'paid', 'reversed'
  )),
  basis_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_collective_entity_readiness (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_cooperative_entities(id) on delete cascade,
  proposed_role text not null default 'readiness_only',
  jurisdiction text not null,
  state text not null default 'readiness_only' check (state in (
    'readiness_only', 'counsel_pending', 'separately_authorized', 'blocked'
  )),
  production_authority boolean not null default false,
  approval_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_cooperative_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_cooperative_outbox (
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

create index if not exists creator_cooperative_outbox_pending_idx
  on public.creator_cooperative_outbox (status, available_at)
  where status in ('pending', 'failed');

alter table public.creator_policy_sources enable row level security;
alter table public.creator_standards_contributions enable row level security;
alter table public.creator_member_benefit_allocations enable row level security;
alter table public.creator_collective_entity_readiness enable row level security;
alter table public.creator_cooperative_audit_events enable row level security;
alter table public.creator_cooperative_outbox enable row level security;

revoke all on
  public.creator_policy_sources,
  public.creator_standards_contributions,
  public.creator_member_benefit_allocations,
  public.creator_collective_entity_readiness,
  public.creator_cooperative_audit_events,
  public.creator_cooperative_outbox
from anon, authenticated;

grant select on public.creator_policy_sources to authenticated;
grant select on public.creator_standards_contributions to authenticated;
grant select on public.creator_member_benefit_allocations to authenticated;
grant select on public.creator_collective_entity_readiness to authenticated;

grant all on
  public.creator_policy_sources,
  public.creator_standards_contributions,
  public.creator_member_benefit_allocations,
  public.creator_collective_entity_readiness,
  public.creator_cooperative_audit_events,
  public.creator_cooperative_outbox
to service_role;

drop policy if exists cc_policy_read on public.creator_policy_sources;
create policy cc_policy_read on public.creator_policy_sources
for select to authenticated using (status in ('reviewed', 'published', 'stale'));

drop policy if exists cc_standards_read on public.creator_standards_contributions;
create policy cc_standards_read on public.creator_standards_contributions
for select to authenticated using (state in ('ready', 'submitted', 'internal_review'));

drop policy if exists cc_benefits_read on public.creator_member_benefit_allocations;
create policy cc_benefits_read on public.creator_member_benefit_allocations
for select to authenticated using (exists (
  select 1 from public.creator_cooperative_members m
  where m.id = member_id and m.user_id = (select auth.uid())
));

drop policy if exists cc_collective_read on public.creator_collective_entity_readiness;
create policy cc_collective_read on public.creator_collective_entity_readiness
for select to authenticated using (production_authority = false);

drop policy if exists cc_policy_service on public.creator_policy_sources;
create policy cc_policy_service on public.creator_policy_sources for all to service_role using (true) with check (true);
drop policy if exists cc_standards_service on public.creator_standards_contributions;
create policy cc_standards_service on public.creator_standards_contributions for all to service_role using (true) with check (true);
drop policy if exists cc_benefits_service on public.creator_member_benefit_allocations;
create policy cc_benefits_service on public.creator_member_benefit_allocations for all to service_role using (true) with check (true);
drop policy if exists cc_collective_service on public.creator_collective_entity_readiness;
create policy cc_collective_service on public.creator_collective_entity_readiness for all to service_role using (true) with check (true);
drop policy if exists cc_audit_service on public.creator_cooperative_audit_events;
create policy cc_audit_service on public.creator_cooperative_audit_events for all to service_role using (true) with check (true);
drop policy if exists cc_outbox_service on public.creator_cooperative_outbox;
create policy cc_outbox_service on public.creator_cooperative_outbox for all to service_role using (true) with check (true);

comment on table public.creator_collective_entity_readiness is 'No collective external action authorized; production_authority must stay false without separate approvals.';

commit;
