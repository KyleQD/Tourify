-- =============================================================================
-- DETAILED EVENTS TABLE CHECK
-- =============================================================================
-- 
-- This script provides a detailed check of the events table structure
-- to understand why the user_id column check is failing
-- =============================================================================

-- Check if events table exists
SELECT 
  'TABLE EXISTENCE CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN '✅ events table exists' ELSE '❌ events table does not exist' END as table_status;

-- Show ALL columns in events table
SELECT 
  'ALL EVENTS COLUMNS' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Check specific columns we're looking for
SELECT 
  'SPECIFIC COLUMN CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'user_id'
  ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as user_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue_id'
  ) THEN '✅ venue_id exists' ELSE '❌ venue_id missing' END as venue_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tour_id'
  ) THEN '✅ tour_id exists' ELSE '❌ tour_id missing' END as tour_id_status;

-- Try to run a simple SELECT to see what happens
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 TESTING DIRECT ACCESS TO EVENTS TABLE...';
  
  BEGIN
    -- Try to count rows
    EXECUTE 'SELECT COUNT(*) FROM events' INTO test_count;
    RAISE NOTICE '   ✅ Successfully counted events table: % rows', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error counting events table: %', SQLERRM;
  END;
  
  BEGIN
    -- Try to access user_id column specifically
    EXECUTE 'SELECT COUNT(*) FROM events WHERE user_id IS NOT NULL' INTO test_count;
    RAISE NOTICE '   ✅ Successfully accessed user_id column: % non-null values', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing user_id column: %', SQLERRM;
  END;
  
END $$;
