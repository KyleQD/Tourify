-- =============================================================================
-- TEST ROW COUNTS FOR EVENTS TABLES
-- =============================================================================
-- 
-- This script checks the row counts of events_v2 vs events tables
-- to verify which one has more data before running the migration.
-- =============================================================================

-- Check if tables exist and get row counts
DO $$
DECLARE
  events_v2_count INTEGER;
  events_count INTEGER;
  events_v2_exists BOOLEAN;
  events_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🔍 CHECKING EVENTS TABLE ROW COUNTS...';
  
  -- Check if events_v2 exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_v2'
  ) INTO events_v2_exists;
  
  -- Check if events exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) INTO events_exists;
  
  RAISE NOTICE '   events_v2 exists: %', events_v2_exists;
  RAISE NOTICE '   events exists: %', events_exists;
  
  -- Get row count for events_v2
  IF events_v2_exists THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events_v2' INTO events_v2_count;
      RAISE NOTICE '   events_v2 row count: %', events_v2_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error counting events_v2: %', SQLERRM;
      events_v2_count := -1;
    END;
  ELSE
    events_v2_count := 0;
    RAISE NOTICE '   events_v2 row count: % (table does not exist)', events_v2_count;
  END IF;
  
  -- Get row count for events
  IF events_exists THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events' INTO events_count;
      RAISE NOTICE '   events row count: %', events_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error counting events: %', SQLERRM;
      events_count := -1;
    END;
  ELSE
    events_count := 0;
    RAISE NOTICE '   events row count: % (table does not exist)', events_count;
  END IF;
  
  -- Show comparison
  RAISE NOTICE '';
  RAISE NOTICE '📊 ROW COUNT COMPARISON:';
  RAISE NOTICE '   events_v2: % rows', events_v2_count;
  RAISE NOTICE '   events: % rows', events_count;
  
  IF events_v2_count > events_count THEN
    RAISE NOTICE '   🎯 RECOMMENDATION: Keep events_v2 (more data), backup events';
  ELSIF events_count > events_v2_count THEN
    RAISE NOTICE '   🎯 RECOMMENDATION: Keep events (more data), backup events_v2';
  ELSE
    RAISE NOTICE '   🎯 RECOMMENDATION: Equal row counts - check data quality';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Row count check complete!';
  
END $$;
