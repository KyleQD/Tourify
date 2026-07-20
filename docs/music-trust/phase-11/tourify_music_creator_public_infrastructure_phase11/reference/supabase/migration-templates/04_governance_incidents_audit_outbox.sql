-- REFERENCE ONLY. Append-only audit/outbox and governance records.

create table if not exists public.creator_public_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.creator_public_infrastructure_entities(id),
  decision_type text not null,
  status text not null default 'draft',
  policy_version text not null,
  decision_json jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null,
  status text not null default 'open',
  public_summary text,
  restricted_details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  resolved_at timestamptz
);

create table if not exists public.creator_public_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  event_type text not null,
  object_type text not null,
  object_id text not null,
  event_version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_public_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.creator_public_governance_decisions enable row level security;
alter table public.creator_public_incidents enable row level security;
alter table public.creator_public_audit_events enable row level security;
alter table public.creator_public_outbox enable row level security;
