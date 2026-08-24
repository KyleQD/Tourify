-- =============================================================================
-- VEN-018 — Reconcile contact_info JSON with the relational venue_contacts
-- model (additive, idempotent)
--
-- Contract: `venue_contacts` (venue_id → venue_profiles.id, already canonical
-- domain) becomes the structured store for venue contact roles and visibility;
-- venue_profiles.contact_info JSON remains a legacy read cache during the
-- migration window. Public exposure of any contact stays OFF by default
-- (governed by settings.show_contact_info / future VEN-026 role flags).
-- =============================================================================

-- Deterministic natural key for idempotency: one booking contact per venue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_contacts_primary_booking
  ON public.venue_contacts (venue_id)
  WHERE is_primary = true AND department = 'booking';

DO $$
DECLARE
  scanned    INT := 0;
  inserted   INT := 0;
  skipped    INT := 0;
  rec        RECORD;
  v_first    TEXT;
  v_last     TEXT;
BEGIN
  FOR rec IN
    SELECT vp.id AS venue_profile_id,
           -- venue_contacts FKs to the OPS mirror (venues), not profiles —
           -- resolve canonical→mirror via the ADR-0001 bridge first, then the
           -- legacy settings JSON key; profile-only venues are counted/skipped.
           vv.id AS target_venue_id,
           vp.contact_info,
           COALESCE(
             NULLIF(vp.contact_info ->> 'manager_name', ''),
             NULLIF(vp.contact_info ->> 'name', ''),
             'Booking Contact'
           ) AS manager_name,
           NULLIF(vp.contact_info ->> 'booking_email', '') AS booking_email,
           NULLIF(vp.contact_info ->> 'email', '')         AS fallback_email,
           NULLIF(vp.contact_info ->> 'phone', '')         AS phone
    FROM public.venue_profiles vp
    LEFT JOIN public.venue_identity_bridges b ON b.venue_profile_id = vp.id
    -- Only accept targets that REALLY exist in venues (stale settings ids
    -- would violate the FK); join filters them to NULL -> skipped below.
    LEFT JOIN public.venues vv ON vv.id = COALESCE(
      b.venues_v2_id,
      CASE
        WHEN vp.settings ->> 'venues_v2_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (vp.settings ->> 'venues_v2_id')::uuid
      END
    )
    WHERE vp.contact_info IS NOT NULL
      AND jsonb_strip_nulls(vp.contact_info) <> '{}'::jsonb
      AND (
        NULLIF(vp.contact_info ->> 'booking_email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'phone', '') IS NOT NULL
      )
  LOOP
    scanned := scanned + 1;

    -- No operational mirror for this profile-only venue → nothing to attach.
    IF rec.target_venue_id IS NULL THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Skip venues that already have a primary booking contact (idempotency).
    IF EXISTS (
      SELECT 1 FROM public.venue_contacts vc
      WHERE vc.venue_id = rec.target_venue_id
        AND vc.is_primary = true
        AND vc.department = 'booking'
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Parse "First Last" best-effort; never fabricate beyond defaults above.
    v_first := NULL;
    v_last  := NULL;
    IF rec.manager_name LIKE '% %' THEN
      v_first := split_part(rec.manager_name, ' ', 1);
      v_last  := substring(rec.manager_name FROM position(' ' IN rec.manager_name) + 1);
    ELSE
      v_first := rec.manager_name;
    END IF;

    BEGIN
      INSERT INTO public.venue_contacts (
        venue_id, first_name, last_name, email, phone,
        department, position, is_primary, notes
      )
      VALUES (
        rec.target_venue_id,
        v_first,
        v_last,
        COALESCE(rec.booking_email, rec.fallback_email),
        rec.phone,
        'booking',
        'Booking Contact',
        true,
        'Migrated from venue_profiles.contact_info (VEN-018)'
      );
      inserted := inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      skipped := skipped + 1;
    END;
  END LOOP;

  RAISE NOTICE 'VEN-018 contact reconciliation: scanned=% inserted=% skipped_existing=%',
    scanned, inserted, skipped;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Every venue with contact data has a canonical booking contact:
--      select count(*) from venue_profiles vp
--      where jsonb_strip_nulls(coalesce(vp.contact_info,'{}'::jsonb)) <> '{}'::jsonb
--        and not exists (select 1 from venue_contacts vc
--                        where vc.venue_id=vp.id and vc.is_primary and vc.department='booking');
-- 2. Double-run: inserted=0 on second execution.
--
-- Rollback: delete migrated rows (notes like 'VEN-018%'); drop partial index.
