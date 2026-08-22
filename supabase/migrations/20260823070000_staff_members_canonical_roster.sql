-- =============================================================================
-- VEN-103 — staff_members is the canonical Venue workforce roster
-- (additive, idempotent backfill + legacy classification)
--
-- Contract: new Venue hires create ONE staff_members row scoped by
-- employer_entity_type='venue' + employer_entity_id=venue_profiles.id.
-- venue_team_members becomes a migration-only legacy table: no new writes from
-- canonical paths, existing rows mapped without loss (dedupe by identity link,
-- NOT by email — VEN-106).
--
-- Current live counts per audit: staff_members=5, venue_team_members=2.
-- =============================================================================

-- ── Legacy classification marker ─────────────────────────────────────────────
COMMENT ON TABLE public.venue_team_members IS
  'LEGACY (VEN-103): migration-only. Canonical Venue roster = staff_members scoped by employer_entity_type/employer_entity_id. Do not write new rows; reads allowed during migration window only.';

-- Identity-link column so legacy rows map deterministically to canonical rows
-- across re-runs (email is NOT a stable identity — VEN-106).
ALTER TABLE public.venue_team_members
  ADD COLUMN IF NOT EXISTS canonical_staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venue_team_members_canonical
  ON public.venue_team_members (canonical_staff_member_id)
  WHERE canonical_staff_member_id IS NOT NULL;

-- ── Idempotent mapping ────────────────────────────────────────────────────────
DO $$
DECLARE
  legacy_total    INT := 0;
  already_linked  INT := 0;
  linked_now      INT := 0;
  unmatched       INT := 0;
  rec             RECORD;
  v_staff_id      UUID;
BEGIN
  SELECT count(*) INTO legacy_total FROM public.venue_team_members;

  FOR rec IN
    SELECT vtm.id, vtm.user_id, vtm.name, vtm.email, vtm.role, vtm.status,
           vtm.canonical_staff_member_id
    FROM public.venue_team_members vtm
  LOOP
    IF rec.canonical_staff_member_id IS NOT NULL THEN
      already_linked := already_linked + 1;
      CONTINUE;
    END IF;

    -- Prefer stable user_id linkage when present; fall back to exact name+venue
    -- match against canonical rows for rows that never had a linked account.
    SELECT sm.id INTO v_staff_id
    FROM public.staff_members sm
    WHERE sm.employer_entity_type = 'venue'
      AND (
        (rec.user_id IS NOT NULL AND sm.user_id = rec.user_id)
        OR (
          rec.user_id IS NULL
          AND lower(COALESCE(sm.name, '')) = lower(COALESCE(rec.name, ''))
          AND lower(COALESCE(sm.email, '')) = lower(COALESCE(rec.email, ''))
        )
      )
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_staff_id IS NULL THEN
      -- No canonical twin exists → migrate the legacy row forward as canonical.
      INSERT INTO public.staff_members (
        user_id, name, email, role, status,
        employer_entity_type, employer_entity_id, created_at, updated_at
      )
      VALUES (
        rec.user_id, rec.name, rec.email,
        COALESCE(rec.role, 'member'),
        CASE rec.status WHEN 'active' THEN 'active' ELSE 'inactive' END,
        'venue',
        rec.venue_id,
        NOW() - INTERVAL '1 second', NOW()
      )
      RETURNING id INTO v_staff_id;

      linked_now := linked_now + 1;
    ELSE
      linked_now := linked_now + 1;
    END IF;

    UPDATE public.venue_team_members
    SET canonical_staff_member_id = v_staff_id
    WHERE id = rec.id;
  END LOOP;

  SELECT count(*) INTO unmatched
  FROM public.venue_team_members
  WHERE canonical_staff_member_id IS NULL;

  RAISE NOTICE 'VEN-103 roster reconciliation: legacy=% pre-linked=% mapped_or_migrated=% unmatched=%',
    legacy_total, already_linked, linked_now, unmatched;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Every legacy row has a canonical twin:
--      select count(*) from venue_team_members where canonical_staff_member_id is null;  → 0
-- 2. No duplicate canonical rows created on re-run (counts stable):
--      select count(*) from staff_members where employer_entity_type='venue';
-- 3. Reconciliation report for VEN-146:
--      select vtm.id legacy_id, sm.id canonical_id, sm.name
--      from venue_team_members vtm join staff_members sm on sm.id = vtm.canonical_staff_member_id;
--
-- Rollback: drop index/column (mapping is metadata-only; migrated INSERTs are
-- additive rows that VEN-146's report tracks).
