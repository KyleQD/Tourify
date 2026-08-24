-- =====================================================================
-- P15 — Ingestion expansion: durable provider cursors/watermarks.
-- Additive; RLS deny-by-default; written only by the trusted server path
-- (runner / scheduled jobs). One row per (source_key, job_kind, scope).
-- =====================================================================

create table if not exists public.world_ingestion_cursors (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  job_kind text not null check (job_kind in ('identity_refresh', 'health_refresh')),
  scope text not null default 'global',
  cursor text,
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint world_ingestion_cursors_identity
    unique nulls not distinct (source_key, job_kind, scope)
);

comment on table public.world_ingestion_cursors is
  'P15 durable per-provider cursors and watermarks. Watermarks only move forward (see lib/world/ingestion/operations.ts#advanceCursor). Never exposed publicly.';

-- Run metadata: record the scheduling decision that authorized each run so
-- operators can audit why a run happened when it did.
alter table public.world_ingestion_runs
  add column if not exists schedule_reason text,
  add column if not exists job_kind text;

create index if not exists world_ingestion_cursors_source_idx
  on public.world_ingestion_cursors (source_key, job_kind);

alter table public.world_ingestion_cursors enable row level security;
