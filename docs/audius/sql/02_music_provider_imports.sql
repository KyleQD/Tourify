-- =============================================================================
-- Tourify × Audius Integration
-- Migration 02: music_provider_imports (import audit trail)
--
-- SAFE TO RUN: additive only.
-- Depends on: 01_music_provider_references.sql (run that first)
-- =============================================================================

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1. Import audit table
--    Records who imported which provider track, from which surface.
-- ---------------------------------------------------------------------------

create table if not exists public.music_provider_imports (
  id                      uuid        primary key default gen_random_uuid(),
  provider_reference_id   uuid        not null
    references public.music_provider_references(id) on delete cascade,
  imported_by             uuid        references auth.users(id) on delete set null,
  -- Which UI surface triggered the import (e.g. 'artist_music_manager')
  source_surface          text,
  -- Additional context (artist_profile_id, session info, etc.) — no PII
  import_context          jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_music_provider_imports_reference
  on public.music_provider_imports (provider_reference_id);

create index if not exists idx_music_provider_imports_imported_by
  on public.music_provider_imports (imported_by, created_at desc)
  where imported_by is not null;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.music_provider_imports enable row level security;

-- Importer can read their own import records
drop policy if exists "Importer can read own imports" on public.music_provider_imports;
create policy "Importer can read own imports"
  on public.music_provider_imports
  for select
  to authenticated
  using (imported_by = auth.uid());

-- Track owner can read imports for their tracks
drop policy if exists "Track owner can read imports for their tracks" on public.music_provider_imports;
create policy "Track owner can read imports for their tracks"
  on public.music_provider_imports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.music_provider_references mpr
      join public.artist_music am on am.id = mpr.track_id
      where mpr.id = music_provider_imports.provider_reference_id
        and am.user_id = auth.uid()
    )
  );

-- Authenticated users can insert their own import records
-- (The API route validates actor ownership before inserting)
drop policy if exists "Authenticated can insert import records" on public.music_provider_imports;
create policy "Authenticated can insert import records"
  on public.music_provider_imports
  for insert
  to authenticated
  with check (imported_by = auth.uid());
