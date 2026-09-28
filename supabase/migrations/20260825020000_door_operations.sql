-- =============================================================================
-- VEN-159 / VEN-157 — Door operations foundation (additive, idempotent)
--
--   1. ticket_checkpoints: named entrances/zones per event so scans carry
--      accountable checkpoint identity (previously a free-text default 'main').
--   2. ticket_checkins.client_scan_id: stable client operation identity so
--      offline retries reconcile exactly once (unique when present).
--
-- No destructive operations; safe to re-run.
-- =============================================================================

-- ── 1. Checkpoint registry ───────────────────────────────────────────────────

create table if not exists public.ticket_checkpoints (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events_v2(id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 60),
  description text,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (event_id, name)
);

comment on table public.ticket_checkpoints is
  'VEN-159: named door entrances/checkpoints per event. Scans reference these by name; unknown checkpoints are rejected when a registry exists.';

create index if not exists idx_ticket_checkpoints_event
  on public.ticket_checkpoints (event_id)
  where is_active;

alter table public.ticket_checkpoints enable row level security;

drop policy if exists ticket_checkpoints_select on public.ticket_checkpoints;
create policy ticket_checkpoints_select
  on public.ticket_checkpoints
  for select
  using (
    public.has_event_ticketing_grant(event_id, 'view_overview')
    or public.has_event_ticketing_grant(event_id, 'scan_tickets')
    or exists (select 1 from public.events_v2 e where e.id = event_id and e.created_by = auth.uid())
  );

drop policy if exists ticket_checkpoints_write on public.ticket_checkpoints;
create policy ticket_checkpoints_write
  on public.ticket_checkpoints
  for all
  using (
    public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
    or exists (select 1 from public.events_v2 e where e.id = event_id and e.created_by = auth.uid())
  )
  with check (
    public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
    or exists (select 1 from public.events_v2 e where e.id = event_id and e.created_by = auth.uid())
  );

-- ── 2. Client scan identity for idempotent offline reconciliation ────────────

alter table public.ticket_checkins
  add column if not exists client_scan_id uuid;

-- One admission per client operation id, ever.
create unique index if not exists idx_ticket_checkins_client_scan_unique
  on public.ticket_checkins (client_scan_id)
  where client_scan_id is not null;

comment on column public.ticket_checkins.client_scan_id is
  'VEN-157: stable client-generated scan operation id; replays of the same id resolve to the original outcome instead of creating duplicates.';
