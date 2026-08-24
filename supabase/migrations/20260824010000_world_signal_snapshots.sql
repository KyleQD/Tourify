-- =====================================================================
-- P9 — World signal snapshots: privacy-safe, windowed aggregates.
-- REPLAY REPAIR (P15): `window` is a reserved word in PostgreSQL and this
-- migration never applied through lineage (it was part of the manual-push
-- set). Column is now the quoted identifier "window"; no environment ever
-- applied the broken form via replay.
-- Deny-by-default RLS. Public reads ONLY for rows meeting the privacy
-- floor (sample_size_bucket <> '<3'). Writes are service/projector only.
-- Explainability: score components + sample bucket, never raw counts or
-- contributor identities.
-- =====================================================================

create table if not exists public.world_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  place_bucket text not null,
  signal_kind text not null check (signal_kind in (
    'artist_popularity','track_popularity','genre_popularity','scene_momentum',
    'event_heat','venue_activity','news_velocity','radio_activity','tourify_activity')),
  "window" text not null check ("window" in ('24h','7d','30d','90d','1y','all_time')),
  value numeric(14,4),
  unique_contributors integer not null default 0,
  sample_size_bucket text not null default '<3' check (sample_size_bucket in ('<3','3-10','11-100','100+')),
  score_components jsonb not null default '{}'::jsonb,
  last_computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists world_signal_snapshot_uq
  on public.world_signal_snapshots (place_bucket, signal_kind, "window");

create index if not exists world_signal_place_idx
  on public.world_signal_snapshots (place_bucket, signal_kind)
  where sample_size_bucket <> '<3';

alter table public.world_signal_snapshots enable row level security;

-- Public read ONLY above the privacy floor.
create policy world_signal_public_read_above_floor
  on public.world_signal_snapshots
  for select to anon, authenticated
  using (sample_size_bucket <> '<3');

-- No insert/update/delete policies for anon/authenticated — service role only.
