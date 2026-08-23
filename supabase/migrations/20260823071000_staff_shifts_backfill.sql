-- =============================================================================
-- VEN-111 — Backfill 104 legacy venue_shifts into canonical staff_shifts +
-- employment_assignments (additive, idempotent, reconciliation-counted)
--
-- Mapping contract:
--   venue_shifts.venue_id (→ venue_profiles.id) === staff_shifts.venue_id domain
--   (ADR-0001). Legacy multi-worker model (staff_needed/staff_assigned +
--   venue_shift_assignments) maps to one canonical shift row per legacy shift,
--   with worker binding expressed as employment_assignments rows carrying
--   staff_shift_id — never by duplicating business meaning (VEN-112 will add
--   the open-shift/position-demand representation).
--
-- Idempotency: staff_shifts.legacy_venue_shift_id unique link; re-runs skip.
-- =============================================================================

-- ── Link column ──────────────────────────────────────────────────────────────
ALTER TABLE public.staff_shifts
  ADD COLUMN IF NOT EXISTS legacy_venue_shift_id UUID REFERENCES public.venue_shifts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_shifts_legacy_venue_shift
  ON public.staff_shifts (legacy_venue_shift_id)
  WHERE legacy_venue_shift_id IS NOT NULL;

COMMENT ON COLUMN public.staff_shifts.legacy_venue_shift_id IS
  'VEN-111 backfill provenance: original venue_shifts row. Read-only after cutover.';

-- ── Shift backfill ────────────────────────────────────────────────────────────
INSERT INTO public.staff_shifts (
  venue_id,
  staff_member_id,
  shift_date,
  start_time,
  end_time,
  break_duration,
  zone_assignment,
  role_assignment,
  notes,
  status,
  legacy_venue_shift_id
)
SELECT
  vs.venue_id,
  NULL,                                   -- worker binding lives in employment_assignments
  vs.shift_date,
  vs.start_time,
  vs.end_time,
  0,
  vs.location,                            -- operational placement
  COALESCE(vs.role_required, vs.department),
  NULLIF(TRIM(BOTH FROM CONCAT(COALESCE(vs.shift_title, ''), E'\n', COALESCE(vs.shift_description, ''))), ''),
  CASE vs.shift_status
    WHEN 'filled'      THEN 'confirmed'
    WHEN 'completed'   THEN 'completed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE 'scheduled'                       -- open / in_progress / unknown
  END,
  vs.id
FROM public.venue_shifts vs
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_shifts ss WHERE ss.legacy_venue_shift_id = vs.id
);

-- ── Worker bindings → employment_assignments ────────────────────────────────
-- venue_shift_assignments.staff_member_id is an untyped legacy UUID. Resolve it
-- against venue_team_members.id first (its historical pairing), then
-- staff_members.id; only rows resolving to a real auth user produce canonical
-- employment assignments. Unresolvable rows are counted for manual review.
DO $$
DECLARE
  rec                  RECORD;
  v_user_id            UUID;
  v_staff_id           UUID;
  v_staff_shift_id     UUID;
  v_starts             TIMESTAMPTZ;
  v_ends               TIMESTAMPTZ;
  inserted_bindings    INT := 0;
  unresolved_bindings  INT := 0;
BEGIN
  FOR rec IN
    SELECT vsa.*, vs.shift_date, vs.start_time, vs.end_time,
           COALESCE(vs.role_required, vs.department) AS role_label,
           vs.venue_id AS legacy_venue_id
    FROM public.venue_shift_assignments vsa
    JOIN public.venue_shifts vs ON vs.id = vsa.shift_id
    WHERE vsa.assignment_status IN ('pending', 'confirmed', 'completed')
  LOOP
    v_user_id := NULL;
    v_staff_id := NULL;

    -- Resolution path A: legacy team-member row carries user identity.
    IF to_regclass('public.venue_team_members') IS NOT NULL THEN
      SELECT vtm.user_id INTO v_user_id
      FROM public.venue_team_members vtm
      WHERE vtm.id = rec.staff_member_id AND vtm.user_id IS NOT NULL
      LIMIT 1;
    END IF;

    -- Resolution path B: direct staff_members row (canonical roster).
    IF v_user_id IS NULL THEN
      SELECT sm.user_id, sm.id INTO v_user_id, v_staff_id
      FROM public.staff_members sm
      WHERE sm.id = rec.staff_member_id
        AND sm.user_id IS NOT NULL
      LIMIT 1;
    ELSE
      SELECT sm.id INTO v_staff_id
      FROM public.staff_members sm
      WHERE sm.user_id = v_user_id
        AND sm.employer_entity_type = 'venue'
        AND COALESCE(sm.employer_entity_id, sm.venue_id) = rec.legacy_venue_id
      ORDER BY sm.created_at ASC
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      unresolved_bindings := unresolved_bindings + 1;
      CONTINUE;
    END IF;

    SELECT ss.id INTO v_staff_shift_id
    FROM public.staff_shifts ss
    WHERE ss.legacy_venue_shift_id = rec.shift_id
    LIMIT 1;

    v_starts := (rec.shift_date + rec.start_time);
    v_ends   := (rec.shift_date + rec.end_time);

    INSERT INTO public.employment_assignments (
      user_id, venue_id, role_title, department,
      starts_at, ends_at, status, staff_shift_id
    )
    VALUES (
      v_user_id,
      rec.legacy_venue_id,
      COALESCE(rec.role_label, 'Venue Crew'),
      NULL,
      v_starts,
      v_ends,
      CASE rec.assignment_status
        WHEN 'completed' THEN 'active'
        WHEN 'confirmed' THEN 'confirmed'
        ELSE 'confirmed'
      END,
      v_staff_shift_id
    )
    ON CONFLICT DO NOTHING;

    -- Keep canonical shift row pointed at its resolved worker when unassigned.
    IF v_staff_id IS NOT NULL THEN
      UPDATE public.staff_shifts
      SET staff_member_id = v_staff_id
      WHERE legacy_venue_shift_id = rec.shift_id AND staff_member_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.staff_shifts other
          WHERE other.legacy_venue_shift_id = rec.shift_id
            AND other.staff_member_id = v_staff_id
        );
    END IF;

    inserted_bindings := inserted_bindings + 1;
  END LOOP;

  RAISE NOTICE 'VEN-111 backfill: shifts_source=% shifts_mapped=% bindings_inserted=% bindings_unresolved=%',
    (SELECT count(*) FROM public.venue_shifts),
    (SELECT count(*) FROM public.staff_shifts WHERE legacy_venue_shift_id IS NOT NULL),
    inserted_bindings,
    unresolved_bindings;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Zero-loss on shifts:     source count == mapped count
--      select (select count(*) from venue_shifts) as src,
--             (select count(*) from staff_shifts where legacy_venue_shift_id is not null) as mapped;
-- 2. Every mapped row keeps canonical scope:
--      select count(*) from staff_shifts where legacy_venue_shift_id is not null and venue_id is null;  → 0
-- 3. Double-run idempotency: both counts unchanged after re-execution.
-- 4. Binding report for manual review:
--      select * from venue_shift_assignments vsa
--      where assignment_status in ('pending','confirmed','completed')
--        and not exists (select 1 from employment_assignments ea where ea.staff_shift_id =
--              (select id from staff_shifts ss where ss.legacy_venue_shift_id = vsa.shift_id));
--
-- Rollback: delete staff_shifts rows where legacy_venue_shift_id is not null
-- (employment_assignments rows cascade via staff_shift_id FK semantics or are
-- removed by the same predicate); drop link column/index.
