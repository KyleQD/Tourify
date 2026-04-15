set client_min_messages = warning;

-- Event Extensions Migration (Safe, Additive)
-- - Adds friendly URL support via slug
-- - Adds created_by (alias for user_id used by some code paths)
-- - Adds expected_attendance, ticket_price_min, ticket_price_max
-- - Introduces event_ticket_types for multi-tier ticketing
-- - Enables RLS and updated_at triggers where applicable

-- Ensure helper functions are present (column_exists, update_updated_at_column)
-- These are defined in 01_helper_functions.sql

-- =============================================================================
-- Extend events table (safe additions)
-- =============================================================================

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS expected_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS ticket_price_min DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS ticket_price_max DECIMAL(10,2);

-- Backfill created_by from user_id for compatibility with existing code paths
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'user_id'
  ) THEN
    UPDATE events SET created_by = user_id WHERE created_by IS NULL;
  END IF;
END $$;

-- Unique slug index (safe: PostgreSQL allows multiple NULLs in unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique ON events(slug);

-- Helpful indexes for common filters (guarded by column existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'created_by'
  ) THEN
    -- Fallback: index on created_by if user_id is not present
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'event_date'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)';
  END IF;
END $$;

-- =============================================================================
-- Ticket types (optional but recommended for multi-tier ticketing)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_ticket_types' AND table_schema = 'public'
  ) THEN
    CREATE TABLE event_ticket_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      quantity_total INTEGER NOT NULL,
      quantity_sold INTEGER NOT NULL DEFAULT 0,
      sales_start TIMESTAMP WITH TIME ZONE,
      sales_end TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created event_ticket_types table';
  ELSE
    RAISE NOTICE 'event_ticket_types table already exists, skipping creation';
  END IF;
END $$;

-- Enable RLS where appropriate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_ticket_types' AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on event_ticket_types';
  END IF;
END $$;

-- Update trigger for updated_at, if helper function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'event_ticket_types' AND column_name = 'updated_at'
    ) THEN
      DROP TRIGGER IF EXISTS update_event_ticket_types_updated_at ON event_ticket_types;
      CREATE TRIGGER update_event_ticket_types_updated_at
        BEFORE UPDATE ON event_ticket_types
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      RAISE NOTICE 'Created updated_at trigger on event_ticket_types';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  tbl_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ EVENT EXTENSIONS MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- Verify events columns
  col_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'slug');
  RAISE NOTICE 'events.slug present: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  col_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by');
  RAISE NOTICE 'events.created_by present: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  col_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'expected_attendance');
  RAISE NOTICE 'events.expected_attendance present: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  col_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_price_min');
  RAISE NOTICE 'events.ticket_price_min present: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  col_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_price_max');
  RAISE NOTICE 'events.ticket_price_max present: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;

  -- Verify ticket types table
  tbl_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_ticket_types' AND table_schema = 'public');
  RAISE NOTICE 'event_ticket_types table present: %', CASE WHEN tbl_exists THEN 'YES' ELSE 'NO' END;
END $$;


