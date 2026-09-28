-- DB-008 / Wave 33: additive public-venue profile presentation columns.
--
-- WHY THIS EXISTS
-- ---------------
-- `tsc --noEmit` on d2176904 reports 1,384 primary diagnostics across 407 files.
-- 50 of them are `SelectQueryError<"column 'social_links' does not exist on
-- 'venue_profiles'">` (27) and `SelectQueryError<"column 'cover_image_url' does
-- not exist on 'venue_profiles'">` (23). Both are read by ENTRY-REACHABLE
-- product surfaces:
--
--   * app/api/venues/[id]/route.ts line 42 selects `social_links` (and line 43
--     `cover_image_url`) in the public venue projection.
--   * lib/seo/public-preview-readers.ts line 97 selects
--     `venue_name, description, city, state, cover_image_url, avatar_url` from
--     `venue_profiles` and uses `cover_image_url` as the preview image fallback.
--
-- Neither column exists in the active 301-migration chain, so the product code is
-- right and the chain is short. This migration closes exactly that gap.
--
-- WHY THESE TWO AND NOT THE OTHER 19 (table, column) PAIRS
-- -------------------------------------------------------
-- These are the only two where the intended column contract is unambiguous from
-- the repository: an equivalent column already exists on a sibling relation with
-- the same shape, so nothing has to be invented.
--
--   * `social_links` — `profiles.social_links jsonb default '{}'::jsonb` was
--     added by 20250819100000_profiles_expand_fields.sql. The venue projection
--     reads the same key/value map.
--   * `cover_image_url` — `tours.cover_image_url text` was added by
--     20260720020302_admin_tour_stop_publish.sql for the same SEO/preview
--     fallback purpose. The SEO reader treats it as a nullable string URL and
--     already falls back to `avatar_url`.
--
-- Every other pair (marketplace_listings.listing_kind, profiles.custom_url,
-- artist_profiles.stage_name, ticket_sales.ticket_type, ...) either has a named
-- canonical replacement in the repository or has no derivable contract, so those
-- are recorded in
-- docs/engineering/database-type-inventory-2026-09-25.json for the owning domain
-- to decide rather than guessed here.
--
-- SAFETY
-- ------
-- Strictly additive: two nullable columns on an existing relation. No table is
-- created, dropped, renamed or rewritten. No policy, grant, role or RLS setting
-- is touched, so no new authorization surface is introduced and the existing
-- `venue_profiles` policies continue to govern every read and write. Both
-- columns default to NULL except `social_links`, which defaults to an empty
-- object so an existing `jsonb` consumer cannot read NULL where it expects a
-- map. The migration is idempotent (`add column if not exists`) and forward-only.

set client_min_messages = warning;

begin;

alter table public.venue_profiles
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists cover_image_url text;

comment on column public.venue_profiles.social_links is
  'Public social/contact links map (mirrors public.profiles.social_links from 20250819100000_profiles_expand_fields.sql). Read by the public venue projection in app/api/venues/[id]/route.ts.';
comment on column public.venue_profiles.cover_image_url is
  'Public cover image URL used as the SEO/preview image fallback ahead of avatar_url (mirrors public.tours.cover_image_url from 20260720020302_admin_tour_stop_publish.sql). Read by lib/seo/public-preview-readers.ts.';

commit;
