-- REFERENCE OUTLINE ONLY. Append-only audit and outbox patterns must match the live app.

create table if not exists public.creator_federation_proposals (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id),
  decision_class text not null,
  policy_version text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_ballots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.creator_federation_proposals(id),
  member_organization_id uuid not null,
  choice text not null,
  cast_by uuid not null,
  evidence_hash text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, member_organization_id)
);

create table if not exists public.creator_federation_disputes (
  id uuid primary key default gen_random_uuid(),
  federation_entity_id uuid not null references public.creator_federation_entities(id),
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_federation_outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
