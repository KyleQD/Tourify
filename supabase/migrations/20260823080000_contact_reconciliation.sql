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

-- The relational table and contact_info column existed on the live reference
-- schema but were never captured by the active migration chain. Capture the
-- smallest canonical shape here. venue_id deliberately references
-- venue_profiles.id per ADR-0001; operational venue mirrors are not identity.
ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.venue_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_contacts_venue
  ON public.venue_contacts (venue_id);

ALTER TABLE public.venue_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_contacts_operator_access ON public.venue_contacts;
CREATE POLICY venue_contacts_operator_access
  ON public.venue_contacts
  FOR ALL
  TO authenticated
  USING (public.venue_has_operator_access(venue_id))
  WITH CHECK (public.venue_has_operator_access(venue_id));

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
           vp.id AS target_venue_id,
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
    WHERE vp.contact_info IS NOT NULL
      AND jsonb_strip_nulls(vp.contact_info) <> '{}'::jsonb
      AND (
        NULLIF(vp.contact_info ->> 'booking_email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'phone', '') IS NOT NULL
      )
  LOOP
    scanned := scanned + 1;

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
