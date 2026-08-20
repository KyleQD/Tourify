set client_min_messages = warning;

-- =============================================================================
-- Tourify × Audius Integration — Database Migration
-- Phase 2: Provider reference and import audit tables
--
-- SAFE TO RUN: additive only. No DROP, TRUNCATE, or destructive changes.
-- No existing rows are modified by this migration.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: music_provider_references
-- Links a canonical artist_music row to an external provider identity.
-- One row per (track_id, provider) and per (provider, external_track_id).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.music_provider_references (
  id                   uuid        primary key default gen_random_uuid(),
  track_id             uuid        not null references public.artist_music(id) on delete cascade,
  provider             text        not null,
  external_track_id    text        not null,
  external_artist_id   text,
  canonical_url        text,
  -- Bounded JSON snapshot of provider metadata (title, artwork URL, duration, etc.)
  -- Must never contain temporary stream URLs.
  metadata             jsonb       not null default '{}'::jsonb,
  metadata_version     integer     not null default 1,
  last_synced_at       timestamptz,
  availability_status  text        not null default 'unknown',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider, external_track_id),
  unique (track_id, provider),
  constraint music_provider_references_provider_check
    check (provider in ('tourify', 'audius')),
  constraint music_provider_references_availability_check
    check (availability_status in ('available', 'unavailable', 'unknown'))
);

create index if not exists idx_music_provider_refs_track_provider
  on public.music_provider_references (track_id, provider);

create index if not exists idx_music_provider_refs_provider_external
  on public.music_provider_references (provider, external_track_id);

create index if not exists idx_music_provider_refs_last_synced
  on public.music_provider_references (last_synced_at)
  where last_synced_at is not null;

alter table public.music_provider_references enable row level security;

drop policy if exists "Provider references readable for public tracks" on public.music_provider_references;
create policy "Provider references readable for public tracks"
  on public.music_provider_references for select
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.is_public = true
        and am.is_visible = true
        and am.moderation_status = 'approved'
    )
  );

drop policy if exists "Owner can read own provider references" on public.music_provider_references;
create policy "Owner can read own provider references"
  on public.music_provider_references for select to authenticated
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

drop policy if exists "Owner can insert provider references" on public.music_provider_references;
create policy "Owner can insert provider references"
  on public.music_provider_references for insert to authenticated
  with check (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

drop policy if exists "Owner can update provider references" on public.music_provider_references;
create policy "Owner can update provider references"
  on public.music_provider_references for update to authenticated
  using (
    exists (
      select 1 from public.artist_music am
      where am.id = music_provider_references.track_id
        and am.user_id = auth.uid()
    )
  );

create or replace function public.set_music_provider_references_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_music_provider_references_updated_at on public.music_provider_references;
create trigger trg_music_provider_references_updated_at
  before update on public.music_provider_references
  for each row execute function public.set_music_provider_references_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: music_provider_imports
-- Audit trail of who imported which provider track, from which surface.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.music_provider_imports (
  id                      uuid        primary key default gen_random_uuid(),
  provider_reference_id   uuid        not null
    references public.music_provider_references(id) on delete cascade,
  imported_by             uuid        references auth.users(id) on delete set null,
  source_surface          text,
  import_context          jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_music_provider_imports_reference
  on public.music_provider_imports (provider_reference_id);

create index if not exists idx_music_provider_imports_imported_by
  on public.music_provider_imports (imported_by, created_at desc)
  where imported_by is not null;

alter table public.music_provider_imports enable row level security;

drop policy if exists "Importer can read own imports" on public.music_provider_imports;
create policy "Importer can read own imports"
  on public.music_provider_imports for select to authenticated
  using (imported_by = auth.uid());

drop policy if exists "Track owner can read imports for their tracks" on public.music_provider_imports;
create policy "Track owner can read imports for their tracks"
  on public.music_provider_imports for select to authenticated
  using (
    exists (
      select 1
      from public.music_provider_references mpr
      join public.artist_music am on am.id = mpr.track_id
      where mpr.id = music_provider_imports.provider_reference_id
        and am.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated can insert import records" on public.music_provider_imports;
create policy "Authenticated can insert import records"
  on public.music_provider_imports for insert to authenticated
  with check (imported_by = auth.uid());
