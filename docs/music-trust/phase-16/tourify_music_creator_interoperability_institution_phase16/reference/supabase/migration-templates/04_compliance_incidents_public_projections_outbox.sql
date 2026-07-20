-- REFERENCE ONLY.
create table if not exists public.creator_interop_compliance_reviews (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 participant_id uuid references public.creator_interop_participants(id), lifecycle_state text not null,
 review_period text not null, finding_summary text, source_manifest_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_incidents (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 severity text not null, lifecycle_state text not null, restricted_details jsonb not null default '{}'::jsonb,
 public_projection_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_public_projections (
 id uuid primary key default gen_random_uuid(), projection_type text not null, source_record_type text not null,
 source_record_id uuid not null, source_version text not null, freshness_at timestamptz not null,
 disputed boolean not null default false, suspended boolean not null default false, revoked boolean not null default false,
 public_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_outbox (
 id uuid primary key default gen_random_uuid(), event_type text not null, idempotency_key text not null unique,
 payload jsonb not null, lifecycle_state text not null default 'pending', attempts integer not null default 0,
 available_at timestamptz not null default now(), created_at timestamptz not null default now()
);
