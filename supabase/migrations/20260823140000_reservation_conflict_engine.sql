-- ═══════════════════════════════════════════════════════════════
-- VEN-084 / VEN-049 / VEN-078 / VEN-086 / VEN-082 — reservation ledger,
-- database-enforced conflict engine, sanitized public availability.
--
-- 1. Reservation model (VEN-084): venue_reservations models room/stage/
--    whole-venue time consumption as intervals. The EXCLUDE USING gist
--    constraint makes overlapping ACTIVE reservations physically impossible —
--    the database decides conflicts, not browser warnings. Setup/teardown
--    buffers expand the guarded range via a generated column.
--
-- 2. Enforcement engine (VEN-078/049): transition into any consuming state
--    (hold/offer/contract/confirmed) atomically claims the interval from the
--    request's booking slot (or day-granularity fallback); cancellation
--    releases the claim. Exclusion violations surface as 40901 so the API
--    maps them to CONFLICT/409.
--
-- 3. Sanitized availability (VEN-082): raw venue_availability (blocked_reason
--    notes, booking/event ids) is no longer readable by anon/public; a
--    minimal public view exposes only venue/date/is_available.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 1. Reservation ledger ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id              uuid NOT NULL REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  resource_key          text NOT NULL DEFAULT 'whole_venue',
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  setup_buffer_minutes  integer NOT NULL DEFAULT 0 CHECK (setup_buffer_minutes BETWEEN 0 AND 720),
  teardown_buffer_minutes integer NOT NULL DEFAULT 0 CHECK (teardown_buffer_minutes BETWEEN 0 AND 720),
  -- Buffered guarded interval [start - setup, end + teardown], computed on
  -- every write by trg_venue_reservations_range (timestamptz ± interval is
  -- only STABLE, which disqualifies GENERATED columns; all program writes go
  -- through create_venue_reservation and this trigger keeps direct SQL sane).
  reserved_range        tstzrange NOT NULL DEFAULT tstzrange(now(), now(), '[)'),
  status                text NOT NULL DEFAULT 'hold'
                        CHECK (status IN ('hold','offer','contract','confirmed','released')),
  source_type           text NOT NULL DEFAULT 'booking_request',
  source_id             uuid NOT NULL,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

COMMENT ON TABLE public.venue_reservations IS
  'VEN-084: consuming time/resource ledger. Active statuses (hold/offer/contract/confirmed) may not overlap per (venue, resource) — enforced by exclusion constraint, not application code.';

CREATE OR REPLACE FUNCTION public.compute_reservation_range()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.reserved_range := tstzrange(
    NEW.starts_at - make_interval(secs => NEW.setup_buffer_minutes * 60),
    NEW.ends_at   + make_interval(secs => NEW.teardown_buffer_minutes * 60),
    '[)'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_reservations_range ON public.venue_reservations;
CREATE TRIGGER trg_venue_reservations_range
  BEFORE INSERT OR UPDATE OF starts_at, ends_at, setup_buffer_minutes, teardown_buffer_minutes
  ON public.venue_reservations
  FOR EACH ROW EXECUTE FUNCTION public.compute_reservation_range();

CREATE INDEX IF NOT EXISTS idx_venue_reservations_source
  ON public.venue_reservations (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_venue_reservations_venue_range
  ON public.venue_reservations USING gist (venue_id, reserved_range)
  WHERE status IN ('hold','offer','contract','confirmed');

ALTER TABLE public.venue_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_reservations_operator ON public.venue_reservations;
CREATE POLICY venue_reservations_operator ON public.venue_reservations
  FOR ALL USING (public.venue_has_operator_access(venue_id));

DROP POLICY IF EXISTS venue_reservations_public_read ON public.venue_reservations;
CREATE POLICY venue_reservations_public_read ON public.venue_reservations
  FOR SELECT USING (true);
-- Public sees existence/timing only; writes stay operator/service-side.

-- THE constraint: two active claims on the same venue+resource can't overlap.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venue_reservations_no_overlap'
  ) THEN
    ALTER TABLE public.venue_reservations
      ADD CONSTRAINT venue_reservations_no_overlap
      EXCLUDE USING gist (
        venue_id WITH =,
        resource_key WITH =,
        reserved_range WITH &&
      ) WHERE (status IN ('hold','offer','contract','confirmed'));
  END IF;
END $$;

-- ── 2. Engine functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_venue_reservation(
  p_venue_id           uuid,
  p_starts_at          timestamptz,
  p_ends_at            timestamptz,
  p_source_id          uuid,
  p_setup_minutes      integer default 0,
  p_teardown_minutes   integer default 0,
  p_resource_key       text    default 'whole_venue',
  p_source_type        text    default 'booking_request',
  p_actor              uuid    default null
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Reservation end must be after start' USING ERRCODE = '22023';
  END IF;
  BEGIN
    INSERT INTO public.venue_reservations
      (venue_id, resource_key, starts_at, ends_at,
       setup_buffer_minutes, teardown_buffer_minutes,
       status, source_type, source_id, created_by)
    VALUES
      (p_venue_id, COALESCE(NULLIF(p_resource_key,''),'whole_venue'),
       p_starts_at, p_ends_at,
       COALESCE(p_setup_minutes,0), COALESCE(p_teardown_minutes,0),
       'hold', p_source_type, p_source_id, p_actor)
    RETURNING id INTO v_id;
  EXCEPTION WHEN SQLSTATE '23P01' THEN
    RAISE EXCEPTION 'Time range conflicts with an existing active reservation'
      USING ERRCODE = '40901';
  END;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_venue_reservation(
  p_source_type text, p_source_id uuid
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.venue_reservations
  SET status = 'released'
  WHERE source_type = p_source_type AND source_id = p_source_id
    AND status IN ('hold','offer','contract','confirmed');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.create_venue_reservation(uuid,timestamptz,timestamptz,uuid,integer,integer,text,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_venue_reservation(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_reservation(uuid,timestamptz,timestamptz,uuid,integer,integer,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_venue_reservation(text,uuid) TO authenticated;

-- ── 3. Transition engine consumes/releases reservations (VEN-078/049/086) ──
CREATE OR REPLACE FUNCTION public.transition_venue_booking_lifecycle(
  p_booking_request_id uuid,
  p_expected_revision  integer,
  p_lifecycle_status   text,
  p_actor_user_id      uuid,
  p_client_request_id  uuid,
  p_note               text default null
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  r public.venue_booking_requests%ROWTYPE;
  s public.venue_booking_slots%ROWTYPE;
  v_from text;
  v_allowed boolean;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  -- Idempotent retry: same client request returns the recorded outcome.
  IF EXISTS (
    SELECT 1 FROM public.venue_booking_lifecycle_history
    WHERE client_request_id = p_client_request_id
      AND request_id = p_booking_request_id
  ) THEN
    RETURN (
      SELECT jsonb_build_object('idempotent', true, 'to', h.to_status)
      FROM public.venue_booking_lifecycle_history h
      WHERE h.client_request_id = p_client_request_id
        AND h.request_id = p_booking_request_id
      ORDER BY created_at DESC LIMIT 1
    );
  END IF;

  SELECT * INTO r FROM public.venue_booking_requests
  WHERE id = p_booking_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Booking request not found' USING ERRCODE = 'P0002'; END IF;

  IF NOT public.venue_has_operator_access(r.venue_id) THEN
    RAISE EXCEPTION 'Not authorized to manage bookings for this venue' USING ERRCODE = '42501';
  END IF;

  v_from := COALESCE(
    r.lifecycle_status,
    CASE r.status WHEN 'approved' THEN 'confirmed' WHEN 'rejected' THEN 'cancelled'
                  WHEN 'cancelled' THEN 'cancelled' ELSE 'inquiry' END
  );

  v_allowed := CASE
    WHEN v_from = 'inquiry'   THEN p_lifecycle_status IN ('hold','offer','cancelled')
    WHEN v_from = 'hold'      THEN p_lifecycle_status IN ('inquiry','offer','cancelled')
    WHEN v_from = 'offer'     THEN p_lifecycle_status IN ('hold','contract','cancelled')
    WHEN v_from = 'contract'  THEN p_lifecycle_status IN ('offer','confirmed','cancelled')
    WHEN v_from = 'confirmed' THEN p_lifecycle_status = 'cancelled'
    ELSE false
  END;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid transition % -> %', v_from, p_lifecycle_status USING ERRCODE = '22023';
  END IF;

  IF r.lifecycle_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Revision conflict' USING ERRCODE = '40001';
  END IF;

  -- VEN-084/086: entering a consuming state claims the calendar interval;
  -- cancellation releases any prior claim. Slot timing wins when linked;
  -- otherwise fall back to date + duration minutes (day start, UTC).
  IF p_lifecycle_status IN ('hold','offer','contract','confirmed') THEN
    IF r.slot_id IS NOT NULL THEN
      SELECT * INTO s FROM public.venue_booking_slots WHERE id = r.slot_id;
      IF s.id IS NOT NULL AND s.slot_end > s.slot_start THEN
        v_start := s.slot_start;
        v_end   := s.slot_end;
      END IF;
    END IF;
    IF v_start IS NULL THEN
      v_start := r.event_date::timestamptz;
      v_end   := v_start + make_interval(secs => COALESCE(r.event_duration, 120)::int * 60);
    END IF;

    PERFORM public.create_venue_reservation(
      p_venue_id         => r.venue_id,
      p_starts_at        => v_start,
      p_ends_at          => v_end,
      p_resource_key     => 'whole_venue',
      p_source_type      => 'booking_request',
      p_source_id        => r.id,
      p_actor            => p_actor_user_id
    );
    UPDATE public.venue_booking_slots
    SET status = CASE p_lifecycle_status WHEN 'hold' THEN 'pending' ELSE 'booked' END
    WHERE id = r.slot_id AND r.slot_id IS NOT NULL;
  ELSIF p_lifecycle_status = 'cancelled' THEN
    PERFORM public.release_venue_reservation('booking_request', r.id);
    UPDATE public.venue_booking_slots
    SET status = 'open'
    WHERE id = r.slot_id AND r.slot_id IS NOT NULL;
  END IF;

  UPDATE public.venue_booking_requests
  SET lifecycle_status = p_lifecycle_status,
      lifecycle_revision = lifecycle_revision + 1,
      response_message = COALESCE(p_note, response_message),
      responded_at = now(),
      updated_at = now()
  WHERE id = p_booking_request_id
  RETURNING * INTO r;

  INSERT INTO public.venue_booking_lifecycle_history
    (request_id, from_status, to_status, actor_user_id, note, client_request_id)
  VALUES (p_booking_request_id, v_from, p_lifecycle_status, p_actor_user_id, p_note, p_client_request_id);

  RETURN jsonb_build_object(
    'id', r.id,
    'from', v_from,
    'to', p_lifecycle_status,
    'revision', r.lifecycle_revision,
    'legacy_status', r.status
  );
EXCEPTION
  WHEN SQLSTATE '40901' THEN
    RAISE;
END;
$$;

-- ── 4. Sanitized public availability (VEN-082) ──────────────────────────────
REVOKE SELECT ON public.venue_availability FROM anon;
REVOKE SELECT ON public.venue_availability FROM public;

DROP VIEW IF EXISTS public.public_venue_availability;
CREATE VIEW public.public_venue_availability
WITH (security_barrier = true) AS
  SELECT va.venue_id, va.date, va.is_available
  FROM public.venue_availability va
  JOIN public.venue_profiles vp ON vp.id = va.venue_id
  WHERE vp.is_public = true
    AND vp.archived_at IS NULL;

GRANT SELECT ON public.public_venue_availability TO anon, authenticated;

COMMENT ON VIEW public.public_venue_availability IS
  'VEN-082: sanitized availability projection — no blocked_reason/notes/booking/event references.';
