-- TOURIFY WORLD OF MUSIC — PHASE 1 MIGRATION BODY
-- Timestamp-neutral handoff artifact. Do not copy this filename into supabase/migrations.
-- Materialize with: supabase migration new world_music_ingestion_staging
-- Baseline: integration/tourify-reconcile-2026-08 + isolated Supabase validation DB.
-- NEVER apply directly to Tourify Demo without explicit authorization.

-- MIGRATION C — PRIVATE INGESTION / REVIEW STAGING
-- Suggested migration name: world_music_ingestion_staging
-- Dependency: Migration B
-- Rationale: imports and agent research must stage candidates before publication.
-- ============================================================================

begin;

create table if not exists public.world_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.world_sources(id) on delete restrict,
  adapter_key text not null,
  status text not null default 'running'
    check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  cursor_state jsonb not null default '{}'::jsonb,
  request_count integer not null default 0 check (request_count >= 0),
  records_received integer not null default 0 check (records_received >= 0),
  candidates_created integer not null default 0 check (candidates_created >= 0),
  matched_existing integer not null default 0 check (matched_existing >= 0),
  published_count integer not null default 0 check (published_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary text,
  correlation_id text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists world_ingestion_runs_source_time_idx
  on public.world_ingestion_runs (source_id, started_at desc);
create index if not exists world_ingestion_runs_status_idx
  on public.world_ingestion_runs (status, started_at desc);

create table if not exists public.world_ingestion_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.world_ingestion_runs(id) on delete set null,
  source_id uuid not null references public.world_sources(id) on delete restrict,
  entity_kind text not null
    check (entity_kind in (
      'place', 'artist', 'track', 'cultural_entity', 'claim',
      'radio_station', 'media_asset', 'relationship'
    )),
  external_record_id text not null,
  normalized_payload jsonb not null,
  payload_hash text,
  match_status text not null default 'unmatched'
    check (match_status in ('unmatched', 'matched', 'ambiguous', 'new_candidate', 'rejected')),
  matched_kind text,
  matched_id text,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'approved', 'rejected')),
  confidence numeric(4,3)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  reviewer_notes text,
  last_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, entity_kind, external_record_id)
);

create index if not exists world_ingestion_candidates_review_idx
  on public.world_ingestion_candidates (review_status, match_status, created_at);
create index if not exists world_ingestion_candidates_run_idx
  on public.world_ingestion_candidates (run_id, created_at);

alter table public.world_ingestion_runs enable row level security;
alter table public.world_ingestion_candidates enable row level security;

revoke all on table public.world_ingestion_runs from anon, authenticated;
revoke all on table public.world_ingestion_candidates from anon, authenticated;

grant select, insert, update, delete on table public.world_ingestion_runs to service_role;
grant select, insert, update, delete on table public.world_ingestion_candidates to service_role;

-- No anon/authenticated policies or grants. Review surfaces must use authorized
-- server-side routes until a dedicated editorial RBAC model is designed.

drop trigger if exists world_ingestion_candidates_updated_at on public.world_ingestion_candidates;
create trigger world_ingestion_candidates_updated_at
  before update on public.world_ingestion_candidates
  for each row execute function public.update_updated_at_column();

commit;
