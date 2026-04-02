-- Recurring booking templates and slots for venue schedules

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Templates (weekly pattern MVP)
CREATE TABLE IF NOT EXISTS venue_recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  genre TEXT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 180,
  start_date DATE NOT NULL,
  end_date DATE,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE venue_recurring_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='venue_recurring_templates' AND policyname='venue_templates_owner'
  ) THEN
    CREATE POLICY venue_templates_owner ON venue_recurring_templates FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
      WITH CHECK (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Materialized slots
CREATE TABLE IF NOT EXISTS venue_booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES venue_recurring_templates(id) ON DELETE SET NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','booked','closed')),
  booked_request_id UUID REFERENCES venue_booking_requests(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, slot_start)
);

ALTER TABLE venue_booking_slots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='venue_booking_slots' AND policyname='venue_slots_owner'
  ) THEN
    CREATE POLICY venue_slots_owner ON venue_booking_slots FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
      WITH CHECK (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='venue_booking_slots' AND policyname='public_can_view_open_slots'
  ) THEN
    CREATE POLICY public_can_view_open_slots ON venue_booking_slots FOR SELECT USING (status = 'open');
  END IF;
END $$;

-- Link booking requests to a slot (optional)
ALTER TABLE IF EXISTS venue_booking_requests
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES venue_booking_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_booking_requests_slot ON venue_booking_requests(slot_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_booking_slots_venue_start ON venue_booking_slots(venue_id, slot_start);

-- RPC: generate weekly slots for a template within a date range
CREATE OR REPLACE FUNCTION generate_slots_for_template(p_template_id UUID, p_from DATE, p_to DATE)
RETURNS INTEGER AS $$
DECLARE
  t RECORD;
  d DATE;
  count_inserted INTEGER := 0;
  batch INTEGER;
  slot_start_ts TIMESTAMPTZ;
  slot_end_ts TIMESTAMPTZ;
BEGIN
  SELECT * INTO t FROM venue_recurring_templates WHERE id = p_template_id AND is_active = TRUE;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF p_from < t.start_date THEN p_from := t.start_date; END IF;
  IF t.end_date IS NOT NULL AND p_to > t.end_date THEN p_to := t.end_date; END IF;

  d := p_from;
  WHILE d <= p_to LOOP
    IF EXTRACT(DOW FROM d)::INT = t.weekday THEN
      slot_start_ts := (d::TIMESTAMP + t.start_time);
      slot_end_ts := slot_start_ts + (t.duration_minutes || ' minutes')::INTERVAL;
      INSERT INTO venue_booking_slots (venue_id, template_id, slot_start, slot_end)
      VALUES (t.venue_id, t.id, slot_start_ts, slot_end_ts)
      ON CONFLICT (venue_id, slot_start) DO NOTHING;
      GET DIAGNOSTICS batch = ROW_COUNT;
      count_inserted := count_inserted + batch;
    END IF;
    d := d + INTERVAL '1 day';
  END LOOP;
  RETURN count_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- When a request linked to a slot is approved, auto-close the slot
CREATE OR REPLACE FUNCTION close_slot_on_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.slot_id IS NOT NULL THEN
    UPDATE venue_booking_slots SET status = 'booked', booked_request_id = NEW.id WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_close_slot_after_request_update ON venue_booking_requests;
CREATE TRIGGER trg_close_slot_after_request_update
AFTER UPDATE ON venue_booking_requests
FOR EACH ROW
EXECUTE FUNCTION close_slot_on_request_approval();


