-- =============================================================================
-- Tourify × Audius Integration
-- Validation queries — run after 01 and 02 to confirm correctness.
-- All queries should return 0 rows (or 0 count) to indicate a clean state.
-- =============================================================================

-- 1. Check for duplicate (provider, external_track_id) combinations
--    Expected: 0 rows
select provider, external_track_id, count(*)
from public.music_provider_references
group by provider, external_track_id
having count(*) > 1;

-- 2. Check for duplicate (track_id, provider) combinations
--    Expected: 0 rows
select track_id, provider, count(*)
from public.music_provider_references
group by track_id, provider
having count(*) > 1;

-- 3. Check for orphaned provider references (no matching artist_music row)
--    Expected: 0 rows
select r.id, r.track_id, r.provider
from public.music_provider_references r
left join public.artist_music am on am.id = r.track_id
where am.id is null;

-- 4. Check for orphaned import records (no matching provider_reference row)
--    Expected: 0 rows
select i.id, i.provider_reference_id
from public.music_provider_imports i
left join public.music_provider_references r on r.id = i.provider_reference_id
where r.id is null;

-- 5. Row counts by provider (informational)
select provider, count(*) as total_references
from public.music_provider_references
group by provider;

-- 6. Confirm RLS is enabled on new tables
--    Expected: both rows show relrowsecurity = true
select relname, relrowsecurity
from pg_class
where relname in ('music_provider_references', 'music_provider_imports')
  and relnamespace = (select oid from pg_namespace where nspname = 'public');

-- 7. Confirm existing artist_music rows are unaffected
--    Expected: same count as before the migration
select count(*) as artist_music_rows from public.artist_music;

-- 8. Confirm music_engagement_events rows are unaffected
--    Expected: same count as before
select count(*) as engagement_event_rows from public.music_engagement_events;
