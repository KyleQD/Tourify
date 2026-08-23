-- ═══════════════════════════════════════════════════════════════
-- VEN-246 + VEN-247 — canonical location columns & amenities array.
--
-- VEN-246: venue_profiles top-level address/city/state/country/postal_code
--          are canonical. Values nested only in contact_info JSON are
--          backfilled into empty columns; conflicting JSON values are left
--          untouched and counted for review (JSON loses, report wins).
--
-- VEN-247: top-level amenities TEXT[] is the one canonical representation.
--          Known keys from the legacy settings.amenities boolean object are
--          merged into the array (synonyms folded, deduped). The settings
--          JSON cache is NOT deleted — writers dual-write during the window;
--          readers reconcile via lib/venue/settings-shapes.ts.
--
-- Idempotent: re-running yields zero additional updates. Additive only; no
-- destructive change. Rollback: values remain in both locations, so reverting
-- app code to legacy reads is safe without a down-migration.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. VEN-246 — location backfill from contact_info JSON
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_backfilled integer := 0;
  v_conflicts  integer := 0;
BEGIN
  UPDATE public.venue_profiles vp
  SET address     = COALESCE(NULLIF(vp.address, ''), NULLIF(vp.contact_info ->> 'address', '')),
      city        = COALESCE(NULLIF(vp.city, ''), NULLIF(vp.contact_info ->> 'city', '')),
      state       = COALESCE(NULLIF(vp.state, ''), NULLIF(vp.contact_info ->> 'state', '')),
      country     = COALESCE(NULLIF(vp.country, ''), NULLIF(vp.contact_info ->> 'country', '')),
      postal_code = COALESCE(NULLIF(vp.postal_code, ''), NULLIF(vp.contact_info ->> 'postal_code', '')),
      updated_at  = now()
  WHERE vp.contact_info IS NOT NULL
    AND jsonb_strip_nulls(vp.contact_info) <> '{}'::jsonb
    AND (
      (COALESCE(vp.address, '') = '' AND COALESCE(vp.contact_info ->> 'address', '') <> '')
      OR (COALESCE(vp.city, '') = '' AND COALESCE(vp.contact_info ->> 'city', '') <> '')
      OR (COALESCE(vp.state, '') = '' AND COALESCE(vp.contact_info ->> 'state', '') <> '')
      OR (COALESCE(vp.country, '') = '' AND COALESCE(vp.contact_info ->> 'country', '') <> '')
      OR (COALESCE(vp.postal_code, '') = '' AND COALESCE(vp.contact_info ->> 'postal_code', '') <> '')
    );
  GET DIAGNOSTICS v_backfilled = ROW_COUNT;

  -- Conflicts: JSON value differs from a non-empty canonical column.
  SELECT count(*) INTO v_conflicts
  FROM public.venue_profiles
  WHERE contact_info IS NOT NULL
    AND (
      (COALESCE(address, '') <> '' AND contact_info ->> 'address' IS NOT NULL AND contact_info ->> 'address' <> address)
      OR (COALESCE(city, '') <> '' AND contact_info ->> 'city' IS NOT NULL AND contact_info ->> 'city' <> city)
      OR (COALESCE(state, '') <> '' AND contact_info ->> 'state' IS NOT NULL AND contact_info ->> 'state' <> state)
      OR (COALESCE(country, '') <> '' AND contact_info ->> 'country' IS NOT NULL AND contact_info ->> 'country' <> country)
      OR (COALESCE(postal_code, '') <> '' AND contact_info ->> 'postal_code' IS NOT NULL AND contact_info ->> 'postal_code' <> postal_code)
    );

  RAISE NOTICE 'VEN-246 location backfill: % row(s) filled from contact_info; % conflicting JSON value row(s) left for review', v_backfilled, v_conflicts;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. VEN-247 — merge legacy settings.amenities object into TEXT[]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_venue_amenity_key(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(btrim(raw))
    WHEN 'accessible'       THEN 'ada_accessible'
    WHEN 'accessibility'    THEN 'ada_accessible'
    WHEN 'ada accessible'   THEN 'ada_accessible'
    WHEN 'wi-fi'            THEN 'wifi'
    WHEN 'lighting'         THEN 'lighting_system'
    WHEN 'lighting rig'     THEN 'lighting_system'
    WHEN 'full bar'         THEN 'bar_service'
    WHEN 'kitchen'          THEN 'catering_kitchen'
    WHEN 'merch table'      THEN 'merchandise_space'
    WHEN 'livestream setup' THEN 'live_streaming'
    ELSE replace(replace(lower(btrim(raw)), ' ', '_'), '-', '_')
  END
$$;

DO $$
DECLARE
  v_rows_updated     integer := 0;
  v_legacy_venues    integer := 0;
  v_unmerged_after   integer := 0;
BEGIN
  WITH target AS (
    SELECT vp.id,
      COALESCE(vp.amenities, '{}'::text[]) AS current_amenities,
      vp.settings
    FROM public.venue_profiles vp
    WHERE vp.settings IS NOT NULL
      AND jsonb_typeof(vp.settings -> 'amenities') = 'object'
  ),
  computed AS (
    SELECT t.id,
      (
        SELECT array_agg(DISTINCT k ORDER BY k)
        FROM (
          SELECT public.normalize_venue_amenity_key(a) AS k
          FROM unnest(t.current_amenities) AS a
          UNION
          SELECT public.normalize_venue_amenity_key(j.k) AS k
          FROM jsonb_object_keys(t.settings -> 'amenities') AS j(k)
          WHERE (t.settings -> 'amenities' -> j.k) IN ('true'::jsonb, '1'::jsonb)
        ) combined
        WHERE k IS NOT NULL
      ) AS next_array
    FROM target t
  )
  UPDATE public.venue_profiles vp
  SET amenities = c.next_array,
      updated_at = now()
  FROM computed c
  WHERE vp.id = c.id
    AND c.next_array IS DISTINCT FROM vp.amenities;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  SELECT count(*) INTO v_legacy_venues
  FROM public.venue_profiles
  WHERE settings IS NOT NULL
    AND jsonb_typeof(settings -> 'amenities') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(settings -> 'amenities') k
      WHERE (settings -> 'amenities' -> k) IN ('true'::jsonb, '1'::jsonb)
    );

  -- Validation: every truthy legacy key must be represented in TEXT[].
  SELECT count(*) INTO v_unmerged_after
  FROM public.venue_profiles
  WHERE settings IS NOT NULL
    AND jsonb_typeof(settings -> 'amenities') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(settings -> 'amenities') k
      WHERE (settings -> 'amenities' -> k) IN ('true'::jsonb, '1'::jsonb)
        AND public.normalize_venue_amenity_key(k) IS DISTINCT FROM NULL
        AND NOT public.normalize_venue_amenity_key(k) = ANY (COALESCE(amenities, '{}'::text[]))
    );

  RAISE NOTICE 'VEN-247 amenities merge: % venue profile(s) updated; % venue(s) had legacy amenity keys; % unmerged row(s) remaining (expected 0)', v_rows_updated, v_legacy_venues, v_unmerged_after;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Validation sweep (expected zero gaps after section 1)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_location_gaps integer;
BEGIN
  SELECT count(*) INTO v_location_gaps
  FROM public.venue_profiles
  WHERE contact_info IS NOT NULL
    AND ((COALESCE(city,'') = '' AND COALESCE(contact_info->>'city','') <> '')
      OR (COALESCE(state,'') = '' AND COALESCE(contact_info->>'state','') <> '')
      OR (COALESCE(country,'') = '' AND COALESCE(contact_info->>'country','') <> '')
      OR (COALESCE(postal_code,'') = '' AND COALESCE(contact_info->>'postal_code','') <> ''));

  RAISE NOTICE 'VEN-246 validation: % unbackfilled location gap row(s) (expected 0)', v_location_gaps;
END $$;
