-- Migration: employment_assignments — the canonical Work Mode table.
--
-- When a user is hired for an event/venue role (e.g. Bartender for Venue X at
-- Event Y), their personal account gains a temporary operational context called
-- Work Mode. This table persists those assignments and is used by the server to
-- resolve additional permissions during the event window.
--
-- This does NOT create a new switcher account type. Work Mode is a transient
-- overlay on the user's general account, surfaced through a separate UI widget.

CREATE TABLE IF NOT EXISTS employment_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The event or venue this assignment belongs to
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  venue_id        UUID REFERENCES venue_profiles(id) ON DELETE SET NULL,

  -- Org / employer that issued the assignment
  organizer_id    UUID REFERENCES organizer_accounts(id) ON DELETE SET NULL,

  -- Human-readable role label (e.g. "Bartender", "Stage Manager", "Security")
  role_title      TEXT NOT NULL,

  -- Optional department bucket (Production, Operations, Security, Medical, …)
  department      TEXT,

  -- Assignment window
  starts_at       TIMESTAMP WITH TIME ZONE,
  ends_at         TIMESTAMP WITH TIME ZONE,

  -- Status lifecycle: invited → confirmed → active → completed / cancelled
  status          TEXT NOT NULL DEFAULT 'invited'
                  CHECK (status IN ('invited', 'confirmed', 'active', 'completed', 'cancelled')),

  -- Runtime permissions granted during this assignment (JSON map of booleans)
  permissions     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fetching a user's active assignments
CREATE INDEX IF NOT EXISTS idx_employment_assignments_user_active
  ON employment_assignments (user_id, status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_employment_assignments_event
  ON employment_assignments (event_id);

CREATE INDEX IF NOT EXISTS idx_employment_assignments_venue
  ON employment_assignments (venue_id);

-- Trigger: keep updated_at in sync
CREATE OR REPLACE FUNCTION set_employment_assignments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_employment_assignments_updated_at ON employment_assignments;
CREATE TRIGGER trg_employment_assignments_updated_at
  BEFORE UPDATE ON employment_assignments
  FOR EACH ROW EXECUTE FUNCTION set_employment_assignments_updated_at();

-- RLS
ALTER TABLE employment_assignments ENABLE ROW LEVEL SECURITY;

-- Users can read their own assignments
CREATE POLICY "users_can_read_own_assignments"
  ON employment_assignments FOR SELECT
  USING (user_id = auth.uid());

-- Organizers / venue owners can read assignments they issued
CREATE POLICY "organizers_can_read_issued_assignments"
  ON employment_assignments FOR SELECT
  USING (
    organizer_id IN (
      SELECT id FROM organizer_accounts WHERE user_id = auth.uid()
    )
    OR venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

-- Organizers / venue owners can create assignments
CREATE POLICY "organizers_can_create_assignments"
  ON employment_assignments FOR INSERT
  WITH CHECK (
    organizer_id IN (
      SELECT id FROM organizer_accounts WHERE user_id = auth.uid()
    )
    OR venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own status (accept/decline), organizers can update any
CREATE POLICY "assignment_status_update"
  ON employment_assignments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR organizer_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid())
    OR venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid())
  );
