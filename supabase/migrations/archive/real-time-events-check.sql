-- =============================================================================
-- REAL-TIME EVENTS TABLES CHECK
-- =============================================================================
-- 
-- This script checks the current status of events-related tables in real-time.
-- Execute to see exactly what exists right now.
-- =============================================================================

-- =============================================================================
-- STEP 1: IMMEDIATE TABLE EXISTENCE CHECK
-- =============================================================================

-- Check if tables exist RIGHT NOW
SELECT 
  'IMMEDIATE CHECK' as info_type,
  'events' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status
UNION ALL
SELECT 
  'IMMEDIATE CHECK' as info_type,
  'events_v2' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status;

-- =============================================================================
-- STEP 2: DIRECT TABLE ACCESS TEST
-- =============================================================================

-- Try to access the tables directly to see what happens
DO $$
DECLARE
  events_exists BOOLEAN;
  events_v2_exists BOOLEAN;
  events_count INTEGER;
  events_v2_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 TESTING DIRECT TABLE ACCESS...';
  
  -- Check if tables exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') INTO events_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') INTO events_v2_exists;
  
  RAISE NOTICE '   events table exists: %', events_exists;
  RAISE NOTICE '   events_v2 table exists: %', events_v2_exists;
  
  -- Try to count rows if tables exist
  IF events_exists THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events' INTO events_count;
      RAISE NOTICE '   events table row count: %', events_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error accessing events table: %', SQLERRM;
    END;
  END IF;
  
  IF events_v2_exists THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events_v2' INTO events_v2_count;
      RAISE NOTICE '   events_v2 table row count: %', events_v2_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error accessing events_v2 table: %', SQLERRM;
    END;
  END IF;
  
END $$;

-- =============================================================================
-- STEP 3: LIST ALL TABLES WITH EVENTS IN NAME
-- =============================================================================

-- Show all tables that might be events-related
SELECT 
  'ALL EVENTS-RELATED TABLES' as info_type,
  table_name,
  table_type,
  'Current table in database' as notes
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%event%' OR 
    table_name LIKE '%Event%' OR
    table_name = 'events' OR
    table_name = 'events_v2' OR
    table_name = 'events_old' OR
    table_name = 'events_v2_old'
  )
ORDER BY table_name;

-- =============================================================================
-- STEP 4: CHECK FOR ANY _V2 TABLES
-- =============================================================================

-- Check if there are any _v2 tables at all
SELECT 
  'V2 TABLES SUMMARY' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as total_v2_tables,
  STRING_AGG(CASE WHEN table_name LIKE '%_v2' THEN table_name END, ', ') as v2_table_names,
  CASE 
    WHEN COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) = 0 THEN '✅ No _v2 tables found'
    ELSE '⚠️ _v2 tables found'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- =============================================================================
-- STEP 5: CURRENT PHASE 3 STATUS
-- =============================================================================

-- Assess the current Phase 3 status based on what we actually found
SELECT 
  'CURRENT PHASE 3 STATUS' as info_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public')
    THEN '✅ PHASE 3 COMPLETE - events_v2 already consolidated'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
    THEN '⚠️ PHASE 3 IN PROGRESS - both tables exist, need consolidation'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
    THEN '🔄 PHASE 3 READY - only events_v2 exists, can rename to events'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public')
    THEN '✅ PHASE 3 COMPLETE - only events table exists'
    ELSE '❓ PHASE 3 UNKNOWN - no events tables found'
  END as current_status,
  'Check results above for exact table state' as next_action
FROM (SELECT 1) as dummy;

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT CHECKS TABLES IN REAL-TIME
-- 2. IT TESTS DIRECT TABLE ACCESS TO IDENTIFY ISSUES
-- 3. IT WILL SHOW EXACTLY WHAT TABLES EXIST RIGHT NOW
-- 4. IT WILL PROVIDE CLEAR GUIDANCE ON NEXT STEPS
--
-- AFTER RUNNING THIS SCRIPT:
-- - You'll know exactly what tables exist right now
-- - You'll understand if there are access issues
-- - You'll get clear guidance on what to do next
--
-- =============================================================================
