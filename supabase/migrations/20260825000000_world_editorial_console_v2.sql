-- =====================================================================
-- P14 — Review Console v2: audit events + optimistic concurrency columns.
-- Additive only; no existing column is modified or repurposed.
--
-- world_editorial_audit_events is append-only evidence for every privileged
-- editorial mutation. Hash-chained rows make silent tampering detectable
-- (verify via lib/world/editorial/audit-events.ts#verifyAuditChain).
-- RLS deny-by-default: writes flow through the trusted server path only;
-- the console reads it with the same privileged client used for staging.
-- =====================================================================

-- Optimistic concurrency (P14-T09) + workspace fields (P14-T02).
alter table public.world_ingestion_candidates
  add column if not exists version int not null default 1,
  add column if not exists assigned_reviewer uuid,
  add column if not exists evidence_requested_at timestamptz,
  add column if not exists merged_into_id text;

alter table public.world_radio_stations
  add column if not exists version int not null default 1;

alter table public.world_claims
  add column if not exists version int not null default 1;

create index if not exists world_ingestion_candidates_assignee_idx
  on public.world_ingestion_candidates (assigned_reviewer)
  where assigned_reviewer is not null;

create table if not exists public.world_editorial_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id text not null,
  action text not null,
  entity_table text not null,
  entity_id text not null,
  before_ref jsonb,
  after_ref jsonb,
  reason text not null check (length(btrim(reason)) > 0),
  prev_hash text,
  event_hash text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.world_editorial_audit_events is
  'P14 append-only editorial audit trail. event_hash chains prev_hash; inserts are server-controlled. Never exposed publicly.';

create index if not exists world_editorial_audit_entity_idx
  on public.world_editorial_audit_events (entity_table, entity_id, occurred_at);
create index if not exists world_editorial_audit_actor_idx
  on public.world_editorial_audit_events (actor_id, occurred_at);

alter table public.world_editorial_audit_events enable row level security;

-- Deny-by-default: NO anon/authenticated policies. The console's trusted
-- server client (service role scoped to World operations) appends events;
-- browsers never receive this table directly.
