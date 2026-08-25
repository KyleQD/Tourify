-- ═══════════════════════════════════════════════════════════════
-- VEN-143 — canonical shift check-in contract (worker self-service).
--
-- Inventory (live): legacy venue_shift_checkins + venue_checkin_qr_codes
-- exist alongside work_mode_check_in_events. Canonical identity is
-- staff_shifts + employment_assignments; this provisions the ENFORCEABLE
-- worker write path so Wave-6 door ops build directly on it:
--
--   worker_shift_check_in  — verifies an ACTIVE employment_assignments row
--                            maps auth.uid() → staff_member_id → the shift,
--                            then stamps check-in fields on staff_shifts.
--   worker_shift_check_out — same identity proof for checkout.
--
-- Legacy tables are NOT granted any new writes; they remain read-only legacy.
-- Idempotent: re-calling check-in just refreshes the timestamp (last-write).
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.worker_shift_check_in(
  p_shift_id uuid,
  p_location text default null
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_staff_id uuid;
  v_rows int;
BEGIN
  -- Identity chain: worker → active employment assignment → this shift.
  SELECT ea.staff_member_id INTO v_staff_id
  FROM public.employment_assignments ea
  WHERE ea.user_id = auth.uid()
    AND ea.staff_shift_id = p_shift_id
    AND ea.status IN ('invited','confirmed','active')
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No active assignment links you to this shift' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_shifts s
  SET checkin_time = now(),
      checkin_type = COALESCE(NULLIF(p_location,''), 'app'),
      status = CASE WHEN s.status IN ('scheduled','pending') THEN 'in_progress' ELSE s.status END,
      updated_at = now()
  WHERE s.id = p_shift_id AND s.staff_member_id = v_staff_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Shift not found for your assignment' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.worker_shift_check_out(p_shift_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_staff_id uuid;
  v_rows int;
BEGIN
  SELECT ea.staff_member_id INTO v_staff_id
  FROM public.employment_assignments ea
  WHERE ea.user_id = auth.uid()
    AND ea.staff_shift_id = p_shift_id
    AND ea.status IN ('confirmed','active')
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No active assignment links you to this shift' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_shifts s
  SET checkout_time = now(),
      status = 'completed',
      updated_at = now()
  WHERE s.id = p_shift_id AND s.staff_member_id = v_staff_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Shift not found for your assignment' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.worker_shift_check_in(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_shift_check_in(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.worker_shift_check_out(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_shift_check_out(uuid) TO authenticated;

DO $$
DECLARE v_present int;
BEGIN
  SELECT count(*) INTO v_present FROM pg_proc
  WHERE pronamespace='public'::regnamespace
    AND proname IN ('worker_shift_check_in','worker_shift_check_out');
  RAISE NOTICE 'VEN-143 canonical check-in contract provisioned: % of 2 routines present', v_present;
END $$;
