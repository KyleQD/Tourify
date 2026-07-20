-- REFERENCE ONLY. Add RLS, grants, indexes, and constraints after repository audit.

create table if not exists public.institutional_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  model_version text not null,
  snapshot jsonb not null,
  input_manifest_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_benchmark_versions (
  id uuid primary key default gen_random_uuid(),
  benchmark_key text not null,
  methodology_version text not null,
  status text not null default 'draft',
  methodology jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (benchmark_key, methodology_version)
);

create table if not exists public.institutional_partner_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  external_event_id text not null,
  event_type text not null,
  raw_payload jsonb not null,
  signature_verified boolean not null default false,
  processing_status text not null default 'received',
  received_at timestamptz not null default now(),
  unique (provider_id, external_event_id)
);

create table if not exists public.institutional_reconciliation_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  domain text not null,
  subject_id uuid,
  severity text not null,
  status text not null default 'open',
  details jsonb not null,
  created_at timestamptz not null default now()
);
