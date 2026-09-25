-- ============================================================================
-- db011_emulation_entitlements_stub.sql
--
-- Applied AFTER supabase/migrations/20260410120000_marketplace_core.sql, which
-- is the migration that creates public.marketplace_entitlements.
--
-- The columns below are the ones the active chain adds to that table in
-- 20260410183000_music_commerce_expansion.sql. That migration is not replayed
-- here because its own prerequisites (public.posts, public.artist_music and
-- their policies) are outside the scope of a three-migration emulation.
--
-- The provenance of these columns is NOT assumed. The replay
-- supabase/tests/db008_chain_contract_replay.mjs attributes each of them to
-- 20260410183000_music_commerce_expansion.sql, and
-- supabase/tests/db008_contract_attribution_audit.mjs independently confirms
-- that file mentions both the relation and the column. The harness asserts the
-- stubbed set matches that attribution, so a change in the chain breaks the
-- harness instead of silently changing what the contract test proves.
-- ============================================================================

alter table public.marketplace_entitlements
  add column if not exists last_downloaded_at timestamptz,
  add column if not exists listing_id uuid,
  add column if not exists music_track_id uuid,
  add column if not exists asset_bucket text,
  add column if not exists asset_path text,
  add column if not exists preview_bucket text,
  add column if not exists preview_path text;
