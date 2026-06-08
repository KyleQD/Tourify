-- =============================================================================
-- CHECK EVENTS TABLES STATUS
-- =============================================================================
-- 
-- This script checks the current status of events-related tables.
-- Execute to see what tables exist and their current state.
-- =============================================================================

-- =============================================================================
-- STEP 1: CHECK WHAT EVENTS-RELATED TABLES EXIST
-- =============================================================================

-- List all tables that might be events-related
SELECT 
  'EXISTING EVENTS TABLES' as info_type,
  table_name,
  table_type,
  'Check if this is the events table' as notes
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
-- STEP 2: CHECK SPECIFIC EVENTS TABLE NAMES
-- =============================================================================

-- Check for exact table names
SELECT 
  'SPECIFIC TABLE CHECK' as info_type,
  'events' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status
UNION ALL
SELECT 
  'SPECIFIC TABLE CHECK' as info_type,
  'events_v2' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status
UNION ALL
SELECT 
  'SPECIFIC TABLE CHECK' as info_type,
  'events_old' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_old' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status
UNION ALL
SELECT 
  'SPECIFIC TABLE CHECK' as info_type,
  'events_v2_old' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2_old' AND table_schema = 'public') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status;

-- =============================================================================
-- STEP 3: CHECK FOR ANY _V2 TABLES
-- =============================================================================

-- Check if there are any _v2 tables at all
SELECT 
  'V2 TABLES CHECK' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as total_v2_tables,
  STRING_AGG(CASE WHEN table_name LIKE '%_v2' THEN table_name END, ', ') as v2_table_names,
  CASE 
    WHEN COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) = 0 THEN '✅ No _v2 tables found'
    ELSE '⚠️ _v2 tables found - need consolidation'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- =============================================================================
-- STEP 4: CHECK FOR ANY _OLD TABLES
-- =============================================================================

-- Check if there are any _old tables (backups)
SELECT 
  'OLD TABLES CHECK' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_old' THEN 1 END) as total_old_tables,
  STRING_AGG(CASE WHEN table_name LIKE '%_old' THEN table_name END, ', ') as old_table_names,
  CASE 
    WHEN COUNT(CASE WHEN table_name LIKE '%_old' THEN 1 END) = 0 THEN '✅ No _old tables found'
    ELSE '📁 Backup tables found'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- =============================================================================
-- STEP 5: PHASE 3 STATUS ASSESSMENT
-- =============================================================================

-- Assess the current Phase 3 status
SELECT 
  'PHASE 3 STATUS ASSESSMENT' as info_type,
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
    ELSE '❓ PHASE 3 UNKNOWN - unexpected table state'
  END as current_status,
  'Check results above for details' as next_action
FROM (SELECT 1) as dummy;

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT DIAGNOSES THE CURRENT STATE OF EVENTS TABLES
-- 2. IT WILL SHOW WHICH TABLES EXIST AND WHICH DON'T
-- 3. IT WILL ASSESS THE CURRENT PHASE 3 STATUS
-- 4. IT WILL PROVIDE GUIDANCE ON NEXT STEPS
--
-- AFTER RUNNING THIS SCRIPT:
-- - You'll know exactly what tables exist
-- - You'll understand the current Phase 3 status
-- - You'll get guidance on what to do next
--
-- =============================================================================
