-- =============================================================================
-- Tourify × Audius Integration
-- Migration 01: music_provider_references + music_provider_imports
--
-- SAFE TO RUN: additive only. No DROP, TRUNCATE, or destructive changes.
-- Run this file in the Supabase SQL editor or via psql.
-- =============================================================================

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1. Provider reference table
--    Links a canonical artist_music row to an external provider identity.
--    One row per (track_id, provider) — enforced by unique constraint.
-- ---------------------------------------------------------------------------

create table if not exists public.music_provider_references (
  id                   uuid        primary key default gen_random_uuid(),
  track_id             uuid        not null references public.artist_music(id) on delete cascade,
  provider             text        not null,
  external_track_id    text        not null,
  external_artist_id   text,
  canonical_url        text,
  -- Bounded JSON snapshot of provider metadata (title, artwork URL, duration, etc.)
  -- Never contains temporary stream URLs.
  metadata             jsonb       not null default '{}'::jsonb,
  metadata_version     integer     not null default 1,
  last_synced_at       timestamptz,
  availability_status  text        not null default 'unknown',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Prevent two tracks pointing at the same provider identity
  unique (provider, external_track_id),
  -- Prevent one track having two references from the same provider
  unique (track_id, provider),
  constraint music_provider_references_provider_check
    check (provider in ('tourify', 'audius')),
  constraint music_provider_references_availability_check
    check (availability_status in ('available', 'unavailable', 'unknown'))
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_music_provider_refs_track_provider
  on public.music_provider_references (track_id, provider);

create index if not exists idx_music_provider_refs_provider_external
  on public.music_provider_references (provider, external_track_id);

create index if not exists idx_music_provider_refs_last_synced
  on public.music_provider_references (last_synced_at)
  where last_synced_at is not null;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.music_provider_references enable row level security;

-- Anyone can read provider references for publicly visible, approved tracks
drop policy if exists "Provider references readable for public tracks" on public.music_provider_references;
create policy "Provider references readable for public tracks"
  on public.music_provider_references
  for select
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.is_public = true
        and am.is_visible = true
        and am.moderation_status = 'approved'
    )
  );

-- Track owner can read their own provider references
drop policy if exists "Owner can read own provider references" on public.music_provider_references;
create policy "Owner can read own provider references"
  on public.music_provider_references
  for select
  to authenticated
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

-- Track owner can insert provider references for their own tracks
drop policy if exists "Owner can insert provider references" on public.music_provider_references;
create policy "Owner can insert provider references"
  on public.music_provider_references
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

-- Track owner can update their own provider references
drop policy if exists "Owner can update provider references" on public.music_provider_references;
create policy "Owner can update provider references"
  on public.music_provider_references
  for update
  to authenticated
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_music_provider_references_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_music_provider_references_updated_at on public.music_provider_references;
create trigger trg_music_provider_references_updated_at
  before update on public.music_provider_references
  for each row execute function public.set_music_provider_references_updated_at();
