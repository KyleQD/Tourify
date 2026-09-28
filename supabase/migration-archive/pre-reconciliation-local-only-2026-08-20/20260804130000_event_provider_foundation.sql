set client_min_messages = warning;

-- ============================================================================
-- Event provider foundation (Phase 1)
-- Additive only. No existing table is altered except enabling nothing on it.
-- All new tables: RLS enabled at creation. Sync writes happen via the
-- service role (server-only); anon/authenticated get public read of display
-- attribution only.
-- ============================================================================

-- One row per provider event identity, linked to the canonical event.
create table if not exists public.event_external_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  source_url text,
  provider_status text,
  provider_updated_at timestamptz,
  last_fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  payload_hash text,
  -- Minimal normalized projection only; raw payloads are not stored by default.
  normalized_payload jsonb,
  is_primary boolean not null default false,
  is_available boolean not null default true,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_external_sources_provider_check
    check (provider in ('ticketmaster', 'bandsintown')),
  unique (provider, provider_event_id)
);

create index if not exists idx_event_external_sources_event
  on public.event_external_sources (event_id);
create index if not exists idx_event_external_sources_expiry
  on public.event_external_sources (provider, expires_at)
  where is_available;

-- Ticket purchase links contributed by providers (checkout stays off-platform).
create table if not exists public.event_ticket_offers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_record_id uuid references public.event_external_sources(id) on delete set null,
  provider text,
  label text,
  url text not null,
  currency text,
  min_price numeric,
  max_price numeric,
  sale_start_at timestamptz,
  sale_end_at timestamptz,
  status text,
  is_primary boolean not null default false,
  affiliate_metadata jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_ticket_offers_event
  on public.event_ticket_offers (event_id);

-- Authorized artist/venue/org connections to external providers (Bandsintown).
-- secret_reference is a pointer into the approved secret store, never a raw key.
create table if not exists public.event_provider_connections (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('artist', 'venue', 'organization')),
  owner_id uuid not null,
  provider text not null,
  external_identity text not null,
  display_name text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'error', 'disconnected')),
  connection_mode text not null default 'artist_owned_key'
    check (connection_mode in ('artist_owned_key', 'partner')),
  secret_reference text,
  scopes text[],
  verified_at timestamptz,
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  last_error_code text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_type, owner_id, provider, external_identity)
);

create index if not exists idx_event_provider_connections_due
  on public.event_provider_connections (provider, next_sync_at)
  where status = 'active';

-- Durable queue for provider sync work, claimed by cron workers.
create table if not exists public.event_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  job_type text not null,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'dead', 'cancelled')),
  priority integer not null default 100,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active job per dedupe key.
create unique index if not exists idx_event_sync_jobs_dedupe_active
  on public.event_sync_jobs (dedupe_key)
  where status in ('queued', 'running') and dedupe_key is not null;

create index if not exists idx_event_sync_jobs_claim
  on public.event_sync_jobs (status, run_after, priority, id)
  where status = 'queued';

create index if not exists idx_event_sync_jobs_stale_locks
  on public.event_sync_jobs (locked_at)
  where status = 'running';

-- Operational history of sync executions.
create table if not exists public.event_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  job_id uuid references public.event_sync_jobs(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'partial')),
  request_count integer not null default 0,
  records_received integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  duplicates_matched integer not null default 0,
  merge_candidates_created integer not null default 0,
  rate_limit_remaining integer,
  error_summary text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_sync_runs_provider_time
  on public.event_sync_runs (provider, started_at desc);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.event_external_sources enable row level security;
alter table public.event_ticket_offers enable row level security;
alter table public.event_provider_connections enable row level security;
alter table public.event_sync_jobs enable row level security;
alter table public.event_sync_runs enable row level security;

-- Public read: display attribution for published events only.
drop policy if exists event_external_sources_public_read on public.event_external_sources;
create policy event_external_sources_public_read
on public.event_external_sources
for select
using (
  exists (
    select 1 from public.events e
    where e.id = event_external_sources.event_id
      and e.status = 'published'
  )
);

-- Public read: ticket offers for published events only.
drop policy if exists event_ticket_offers_public_read on public.event_ticket_offers;
create policy event_ticket_offers_public_read
on public.event_ticket_offers
for select
using (
  exists (
    select 1 from public.events e
    where e.id = event_ticket_offers.event_id
      and e.status = 'published'
  )
);

-- Connections: owner-managers can read their own; inserts require a session
-- user creating for themselves. Authorization for the owning account is
-- enforced again in application code (never from user-editable metadata).
drop policy if exists event_provider_connections_owner_read on public.event_provider_connections;
create policy event_provider_connections_owner_read
on public.event_provider_connections
for select
using (auth.uid() = created_by);

drop policy if exists event_provider_connections_owner_insert on public.event_provider_connections;
create policy event_provider_connections_owner_insert
on public.event_provider_connections
for insert
with check (auth.uid() = created_by);

drop policy if exists event_provider_connections_owner_update on public.event_provider_connections;
create policy event_provider_connections_owner_update
on public.event_provider_connections
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- Sync jobs/runs: no client access. Service role bypasses RLS.
-- (No policies => deny all for anon/authenticated.)

-- Explicit grants: Supabase Data API requires grants in addition to RLS.
grant select on public.event_external_sources to anon, authenticated;
grant select on public.event_ticket_offers to anon, authenticated;
grant select, insert, update on public.event_provider_connections to authenticated;
-- No grants on event_sync_jobs / event_sync_runs for anon/authenticated.
