-- =============================================================================
-- DB-005 (wave 2026-09-22) — Creator metadata for the canonical accounts
-- search projection (actioned handoff HF-DISC-002-CREATOR-METADATA, task
-- DISC-002 "Consolidate search to one endpoint")
--
-- Gap: the canonical /api/search profile path (lib/search/global-search-service.ts
-- queryProfiles) reads ONLY public.accounts, whose projection exposes
-- {kind:'profile', handle, profileType, location}. Creator-only search
-- (/api/search/enhanced, compatibility surface) derives genres, skills /
-- creatorType / service, availability / availableForHire, and artistProfileId
-- from artist_profiles.genres (text[]) and artist_profiles.settings (jsonb via
-- lib/creator/capability-system.ts extractCreatorCapabilitiesV1), plus subtype
-- from accounts.metadata.subtype. accounts has no equivalent columns, so the
-- canonical contract cannot express equivalent filters without this
-- schema/projection change (CP-052: accounts is the compatibility/search
-- projection; projection changes must not authorize organization scope or
-- bypass RLS at the data boundary).
--
-- This forward-only, additive migration extends the accounts search projection
-- with four creator columns, then backfills them from artist_profiles over the
-- identity key the projection already carries:
--   accounts.profile_table = 'artist_profiles' AND accounts.profile_id = ap.id
-- (the unique(profile_table, profile_id) polymorphic identity used by the
-- projection and by the historical upsert_account convention).
--
-- Columns added to public.accounts (all additive; existing rows get fast
-- defaults on PG11+, existing INSERTs are unaffected):
--   1. artist_profile_id uuid                        -- artist_profiles.id (artistProfileId)
--   2. genres text[] not null default '{}'           -- snapshot of artist_profiles.genres
--   3. creator_settings jsonb not null default '{}'  -- raw snapshot of
--      artist_profiles.settings; the canonical TS extractCreatorCapabilitiesV1
--      derives skills/creatorType/service from this at read time, so no
--      SQL-side re-implementation of parseCapabilityList is introduced (no
--      derivation drift).
--   4. creator_available_for_hire boolean not null default false -- derived
--      availability gate matching the enhanced route's availableForHire filter:
--      coalesce(settings.capabilities_v1.availableForHire,
--               settings.preferences.available_for_hire, false) with
--      JSON-boolean semantics (false is kept; null/missing falls back).
--
-- subtype is NOT duplicated: accounts.metadata.subtype already carries it and
-- is already selected by the canonical profile projection.
--
-- Backfill: one UPDATE ... FROM with an explicit WHERE on the projection
-- identity key plus a change-guard so a re-run is a genuine no-op. Only artist
-- accounts that already exist in the projection are touched; artists without an
-- accounts row stay out of the projection exactly as today, and non-artist
-- accounts are untouched. No DELETE/TRUNCATE, no DROP, no constraint, no policy
-- change, no RLS bypass: the new columns live inside the existing accounts read
-- gate (accounts_public_active_read) and carry data already publicly derivable
-- from artist_profiles (public select policy).
--
-- Source-field assumption recorded (confirmation requested from the artist
-- domain via handoff HF-DB-005-ARTIST-CREATOR-FIELDS):
--   * artist_profiles.settings is the creator-capabilities JSON consumed by
--     extractCreatorCapabilitiesV1 (capabilities_v1.* with professional.* /
--     preferences.* fallbacks; settings.public_profile !== false is the public
--     gate — the same gate the enhanced route and
--     lib/public-artist/get-public-artist-profile.ts apply).
--   * capabilities_v1.availableForHire and preferences.available_for_hire are
--     JSON booleans as written by the creator-profile editor; non-boolean JSON
--     (object/array/string) under those keys is treated as absent and falls
--     through to the next source/default (defensive jsonb_typeof guard), which
--     diverges from TS Boolean() coercion only for malformed data.
--
-- Refresh: this migration backfills at apply time. Ongoing freshness (a
-- projection trigger on artist_profiles or an extension of the existing
-- refresh_account_display_info projection refresh) is intentionally NOT added
-- here — it touches the artist-domain-owned write path and must be confirmed by
-- the artist agent before a follow-up additive migration (see manifest
-- recovery/forward-fix and the artist handoff).
--
-- Disposition (CP-051 — authored here, applied manually by the operator only;
-- never applied, reset, replayed, or pushed from the authoring lane):
--   1. ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS x4 (fast defaults).
--   2. UPDATE backfill from public.artist_profiles over the projection identity
--      key, with an explicit WHERE + change-guard.
--   3. CREATE INDEX IF NOT EXISTS idx_accounts_creator_artist_profile (partial
--      btree on artist_profile_id) and idx_accounts_creator_genres (partial gin
--      on genres) — both partial on artist_profile_id IS NOT NULL so only
--      creator rows are indexed.
-- Reversible-by-drop: dropping the two indexes and four columns (via a later
-- explicit reviewed additive migration or operator rollback) restores the prior
-- shape; artist_profiles remains the untouched source of truth.
-- =============================================================================

alter table public.accounts
  add column if not exists artist_profile_id uuid,
  add column if not exists genres text[] not null default '{}'::text[],
  add column if not exists creator_settings jsonb not null default '{}'::jsonb,
  add column if not exists creator_available_for_hire boolean not null default false;

comment on column public.accounts.artist_profile_id is
  'Creator search projection: artist_profiles.id for rows whose profile_table = ''artist_profiles'' (artistProfileId); null for non-creator accounts. Populated by the creator-search-metadata backfill; artist_profiles remains the source of truth.';
comment on column public.accounts.genres is
  'Creator search projection: snapshot of artist_profiles.genres for artist accounts, empty array for non-artists. Source of truth: artist_profiles.genres.';
comment on column public.accounts.creator_settings is
  'Creator search projection: raw snapshot of artist_profiles.settings; canonical capability derivation (creatorType/serviceOfferings/credentials/availableForHire) stays in lib/creator/capability-system.ts extractCreatorCapabilitiesV1 so no SQL-side parsing drift is introduced. Source of truth: artist_profiles.settings; settings.public_profile is not false is the public gate.';
comment on column public.accounts.creator_available_for_hire is
  'Creator search projection: derived availability gate matching the enhanced-search availableForHire filter — coalesce(settings.capabilities_v1.availableForHire, settings.preferences.available_for_hire, false) with JSON-boolean semantics (false is kept; null/missing falls back; non-boolean JSON falls through defensively).';

update public.accounts a
set
  artist_profile_id = ap.id,
  genres = coalesce(ap.genres, '{}'::text[]),
  creator_settings = coalesce(ap.settings, '{}'::jsonb),
  creator_available_for_hire = coalesce(
    case
      when jsonb_typeof(ap.settings #> '{capabilities_v1,availableForHire}') = 'boolean'
        then (ap.settings #>> '{capabilities_v1,availableForHire}')::boolean
    end,
    case
      when jsonb_typeof(ap.settings #> '{preferences,available_for_hire}') = 'boolean'
        then (ap.settings #>> '{preferences,available_for_hire}')::boolean
    end,
    false
  )
from public.artist_profiles ap
where a.profile_table = 'artist_profiles'
  and a.profile_id = ap.id
  and (
    a.artist_profile_id is distinct from ap.id
    or a.genres is distinct from coalesce(ap.genres, '{}'::text[])
    or a.creator_settings is distinct from coalesce(ap.settings, '{}'::jsonb)
    or a.creator_available_for_hire is distinct from coalesce(
      case
        when jsonb_typeof(ap.settings #> '{capabilities_v1,availableForHire}') = 'boolean'
          then (ap.settings #>> '{capabilities_v1,availableForHire}')::boolean
      end,
      case
        when jsonb_typeof(ap.settings #> '{preferences,available_for_hire}') = 'boolean'
          then (ap.settings #>> '{preferences,available_for_hire}')::boolean
      end,
      false
    )
  );

create index if not exists idx_accounts_creator_artist_profile
  on public.accounts (artist_profile_id)
  where artist_profile_id is not null;

create index if not exists idx_accounts_creator_genres
  on public.accounts using gin (genres)
  where artist_profile_id is not null;