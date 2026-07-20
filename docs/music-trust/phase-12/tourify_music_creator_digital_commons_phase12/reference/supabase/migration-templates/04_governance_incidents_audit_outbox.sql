-- REFERENCE OUTLINE ONLY.

create table if not exists public.creator_commons_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id),
  decision_kind text not null,
  status text not null default 'draft',
  authority_scope jsonb not null default '{}'::jsonb,
  evidence_manifest_id uuid,
  policy_version text not null,
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_kind text not null,
  severity text not null,
  status text not null default 'open',
  affected_scopes jsonb not null default '[]'::jsonb,
  public_summary text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.creator_commons_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_service text,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  policy_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_outbox (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  aggregate_id text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.creator_commons_governance_decisions enable row level security;
alter table public.creator_commons_incidents enable row level security;
alter table public.creator_commons_audit_events enable row level security;
alter table public.creator_commons_outbox enable row level security;
