-- Phase 10 S6/S12: proposals, ballots, disputes, audit, outbox.

begin;

create table if not exists public.creator_federation_proposals (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id) on delete cascade,
  decision_class text not null default 'administrative',
  policy_version text not null default '1.0.0',
  title text not null default '',
  body jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'ratifying', 'approved', 'rejected', 'vetoed', 'withdrawn', 'blocked'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_ballots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.creator_federation_proposals(id) on delete cascade,
  member_organization_id uuid not null,
  choice text not null check (choice in ('yes', 'no', 'abstain')),
  cast_by uuid not null references auth.users(id) on delete cascade,
  evidence_hash text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, member_organization_id)
);

create table if not exists public.creator_federation_disputes (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'open' check (status in (
    'open', 'mediation', 'appealed', 'resolved', 'dismissed'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'delivered', 'failed', 'dead'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists creator_federation_outbox_pending_idx
  on public.creator_federation_outbox_events (status, available_at)
  where status in ('pending', 'failed');

alter table public.creator_federation_proposals enable row level security;
alter table public.creator_federation_ballots enable row level security;
alter table public.creator_federation_disputes enable row level security;
alter table public.creator_federation_audit_events enable row level security;
alter table public.creator_federation_outbox_events enable row level security;

revoke all on
  public.creator_federation_proposals,
  public.creator_federation_ballots,
  public.creator_federation_disputes,
  public.creator_federation_audit_events,
  public.creator_federation_outbox_events
from anon, authenticated;

grant select, insert on public.creator_federation_proposals to authenticated;
grant select, insert on public.creator_federation_ballots to authenticated;
grant select, insert on public.creator_federation_disputes to authenticated;

grant all on
  public.creator_federation_proposals,
  public.creator_federation_ballots,
  public.creator_federation_disputes,
  public.creator_federation_audit_events,
  public.creator_federation_outbox_events
to service_role;

drop policy if exists cf_proposals_access on public.creator_federation_proposals;
create policy cf_proposals_access on public.creator_federation_proposals
for all to authenticated using (true) with check (created_by = (select auth.uid()));

drop policy if exists cf_ballots_access on public.creator_federation_ballots;
create policy cf_ballots_access on public.creator_federation_ballots
for all to authenticated using (cast_by = (select auth.uid()))
with check (cast_by = (select auth.uid()));

drop policy if exists cf_disputes_access on public.creator_federation_disputes;
create policy cf_disputes_access on public.creator_federation_disputes
for all to authenticated using (created_by = (select auth.uid()) or true)
with check (created_by = (select auth.uid()));

drop policy if exists cf_proposals_service on public.creator_federation_proposals;
create policy cf_proposals_service on public.creator_federation_proposals for all to service_role using (true) with check (true);
drop policy if exists cf_ballots_service on public.creator_federation_ballots;
create policy cf_ballots_service on public.creator_federation_ballots for all to service_role using (true) with check (true);
drop policy if exists cf_disputes_service on public.creator_federation_disputes;
create policy cf_disputes_service on public.creator_federation_disputes for all to service_role using (true) with check (true);
drop policy if exists cf_audit_service on public.creator_federation_audit_events;
create policy cf_audit_service on public.creator_federation_audit_events for all to service_role using (true) with check (true);
drop policy if exists cf_outbox_service on public.creator_federation_outbox_events;
create policy cf_outbox_service on public.creator_federation_outbox_events for all to service_role using (true) with check (true);

commit;
