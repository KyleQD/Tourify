-- =====================================================================
-- P16 — Listen Here: regional editorial playlists, station reports,
-- and privacy-safe playback quality events. Additive; RLS on every table.
-- =====================================================================

-- Regional editorial playlists (T07): canonical identifiers only.
create table if not exists public.world_regional_playlists (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.geo_places(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  curator_id text not null,
  publication_state text not null default 'draft'
    check (publication_state in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_regional_playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.world_regional_playlists(id) on delete cascade,
  position integer not null check (position >= 0),
  item_kind text not null check (item_kind in ('track', 'radio_station', 'media_asset')),
  -- Canonical identifier only: URLs are structurally forbidden so protected
  -- stream locations can never be frozen into editorial data (T07/T03).
  item_id text not null check (item_id !~ '^https?://'),
  created_at timestamptz not null default now(),

  constraint world_regional_playlist_items_position_uq unique (playlist_id, position)
);
create index if not exists world_regional_playlist_items_lookup_idx
  on public.world_regional_playlist_items (playlist_id, position);

comment on table public.world_regional_playlists is
  'P16 regional editorial playlists. Items reference canonical ids resolved through the playback resolver; raw media URLs are forbidden by check constraint.';

-- Station reporting / correction + health feedback (T08).
create table if not exists public.world_radio_station_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.world_radio_stations(id) on delete cascade,
  report_kind text not null check (report_kind in ('correction', 'health_feedback', 'unavailable')),
  message text not null check (length(btrim(message)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists world_radio_station_reports_station_idx
  on public.world_radio_station_reports (station_id, status, created_at);

alter table public.world_radio_station_reports enable row level security;
-- Deny-by-default to anon/authenticated; console trusted path writes/reads.

-- Playback quality events (T09). Coarse fields only — no listener identity,
-- no IP, no coordinates (enforced structurally by sanitizePlaybackTelemetry).
create table if not exists public.world_playback_events (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (event_kind in (
    'play_start_success', 'reconnect', 'early_failure', 'rights_denied',
    'terminal_unavailable')),
  station_id text,
  media_id text,
  seconds_into_playback numeric(8,2),
  reconnect_attempt integer,
  occurred_at timestamptz not null default now()
);
create index if not exists world_playback_events_kind_time_idx
  on public.world_playback_events (event_kind, occurred_at);

alter table public.world_playback_events enable row level security;
-- Insert allowed for authenticated listeners (coarse rows only); reads stay
-- with the console's trusted path.
create policy world_playback_events_listener_insert
  on public.world_playback_events
  for insert to authenticated
  with check (true);

alter table public.world_regional_playlists enable row level security;
alter table public.world_regional_playlist_items enable row level security;
