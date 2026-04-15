set client_min_messages = warning;

-- Attach events to venues by optional foreign key venue_id
-- Idempotent migration: safe to run multiple times

-- 1) Add column if missing
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS venue_id UUID;

-- 2) Add index on venue_id for faster lookups (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_events_venue_id'
  ) THEN
    CREATE INDEX idx_events_venue_id ON events(venue_id);
  END IF;
END $$;

-- 3) Add FK constraint to venue_profiles(id) when table exists
DO $$
BEGIN
  -- Only add constraint if venue_profiles table exists and constraint not present
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'venue_profiles'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'events' 
      AND constraint_name = 'fk_events_venue_id'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT fk_events_venue_id
      FOREIGN KEY (venue_id) REFERENCES venue_profiles(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- If either table is missing in this environment, skip FK wiring gracefully
  NULL;
END $$;


