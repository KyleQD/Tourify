-- Event Attendance & Guestlist (Safe, Additive)
-- - Adds event_attendance for RSVP statuses
-- - Adds event_guestlist for invited guests (with optional user binding)
-- - Enables RLS and updated_at triggers when helpers are available

-- =============================================================================
-- event_attendance
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_attendance' AND table_schema = 'public'
  ) THEN
    CREATE TABLE event_attendance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('attending','interested','not_going')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(event_id, user_id)
    );
    RAISE NOTICE 'Created event_attendance table';
  ELSE
    RAISE NOTICE 'event_attendance already exists, skipping creation';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(status);

-- Enable RLS
DO $$
BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name = 'event_attendance' AND table_schema = 'public';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on event_attendance';
  END IF;
END $$;

-- Simple policies
DO $$
BEGIN
  -- creators can manage attendance for their events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendance' AND policyname = 'creator_manage_attendance'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY creator_manage_attendance ON event_attendance
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_attendance.event_id
            AND (e.created_by = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_attendance.event_id
            AND (e.created_by = auth.uid())
        )
      );
    $policy$;
  END IF;

  -- users can upsert their own RSVP
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendance' AND policyname = 'user_manage_own_rsvp'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY user_manage_own_rsvp ON event_attendance
      FOR INSERT WITH CHECK (user_id = auth.uid());
    $policy$;
    EXECUTE $policy$
      CREATE POLICY user_update_own_rsvp ON event_attendance
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    $policy$;
    EXECUTE $policy$
      CREATE POLICY user_read_published_event ON event_attendance
      FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_attendance.event_id
            AND (e.created_by = auth.uid())
        )
      );
    $policy$;
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'event_attendance' AND column_name = 'updated_at'
    ) THEN
      DROP TRIGGER IF EXISTS update_event_attendance_updated_at ON event_attendance;
      CREATE TRIGGER update_event_attendance_updated_at
        BEFORE UPDATE ON event_attendance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      RAISE NOTICE 'Created updated_at trigger on event_attendance';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- event_guestlist
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_guestlist' AND table_schema = 'public'
  ) THEN
    CREATE TABLE event_guestlist (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- optional binding
      full_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      guests_count INTEGER DEFAULT 1 CHECK (guests_count > 0),
      status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','confirmed','declined','checked_in')),
      invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      invite_code TEXT,
      notes TEXT,
      checked_in_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(event_id, invite_code)
    );
    RAISE NOTICE 'Created event_guestlist table';
  ELSE
    RAISE NOTICE 'event_guestlist already exists, skipping creation';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_guestlist_event ON event_guestlist(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guestlist_user ON event_guestlist(user_id);
CREATE INDEX IF NOT EXISTS idx_event_guestlist_status ON event_guestlist(status);

-- Enable RLS
DO $$
BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name = 'event_guestlist' AND table_schema = 'public';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE event_guestlist ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on event_guestlist';
  END IF;
END $$;

-- Simple policies
DO $$
BEGIN
  -- creator full access to guestlist rows of their events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_guestlist' AND policyname = 'creator_manage_guestlist'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY creator_manage_guestlist ON event_guestlist
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_guestlist.event_id
            AND (e.created_by = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_guestlist.event_id
            AND (e.created_by = auth.uid())
        )
      );
    $policy$;
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'event_guestlist' AND column_name = 'updated_at'
    ) THEN
      DROP TRIGGER IF EXISTS update_event_guestlist_updated_at ON event_guestlist;
      CREATE TRIGGER update_event_guestlist_updated_at
        BEFORE UPDATE ON event_guestlist
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      RAISE NOTICE 'Created updated_at trigger on event_guestlist';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  tbl_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ EVENT ATTENDANCE & GUESTLIST MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  tbl_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_attendance' AND table_schema = 'public');
  RAISE NOTICE 'event_attendance present: %', CASE WHEN tbl_exists THEN 'YES' ELSE 'NO' END;
  tbl_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_guestlist' AND table_schema = 'public');
  RAISE NOTICE 'event_guestlist present: %', CASE WHEN tbl_exists THEN 'YES' ELSE 'NO' END;
END $$;


