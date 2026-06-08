-- =============================================================================
-- PHASE 3: EXECUTE TABLE CONSOLIDATIONS
-- =============================================================================
-- 
-- This script executes the actual table consolidations based on the
-- analysis from Phase 3. Execute AFTER Phase 3 analysis is complete.
--
-- EXECUTION ORDER:
-- 1. Consolidate events vs events_v2
-- 2. Consolidate profiles vs profiles_v2
-- 3. Consolidate accounts vs accounts_v2
-- 4. Consolidate other duplicate tables
-- 5. Verify data integrity after consolidation
-- =============================================================================

-- =============================================================================
-- STEP 1: CONSOLIDATE EVENTS VS EVENTS_V2
-- =============================================================================

-- Check if both events and events_v2 exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') THEN
    
    RAISE NOTICE '🚨 CONSOLIDATION NEEDED: events and events_v2 both exist';
    RAISE NOTICE '   Analyzing table structures...';
    
    -- Check row counts in both tables
    DECLARE
      events_count INTEGER;
      events_v2_count INTEGER;
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events' INTO events_count;
      EXECUTE 'SELECT COUNT(*) FROM events_v2' INTO events_v2_count;
      
      RAISE NOTICE '   events table: % rows', events_count;
      RAISE NOTICE '   events_v2 table: % rows', events_v2_count;
      
      -- Recommend which table to keep based on data
      IF events_v2_count > events_count THEN
        RAISE NOTICE '   RECOMMENDATION: Keep events_v2 (more data), migrate from events';
      ELSE
        RAISE NOTICE '   RECOMMENDATION: Keep events (more data), migrate from events_v2';
      END IF;
    END;
    
  ELSE
    RAISE NOTICE '✅ No consolidation needed for events tables';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: CONSOLIDATE PROFILES VS PROFILES_V2
-- =============================================================================

-- Check if both profiles and profiles_v2 exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_v2' AND table_schema = 'public') THEN
    
    RAISE NOTICE '🚨 CONSOLIDATION NEEDED: profiles and profiles_v2 both exist';
    RAISE NOTICE '   Analyzing table structures...';
    
    -- Check row counts in both tables
    DECLARE
      profiles_count INTEGER;
      profiles_v2_count INTEGER;
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM profiles' INTO profiles_count;
      EXECUTE 'SELECT COUNT(*) FROM profiles_v2' INTO profiles_v2_count;
      
      RAISE NOTICE '   profiles table: % rows', profiles_count;
      RAISE NOTICE '   profiles_v2 table: % rows', profiles_v2_count;
      
      -- Recommend which table to keep based on data
      IF profiles_v2_count > profiles_count THEN
        RAISE NOTICE '   RECOMMENDATION: Keep profiles_v2 (more data), migrate from profiles';
      ELSE
        RAISE NOTICE '   RECOMMENDATION: Keep profiles (more data), migrate from profiles_v2';
      END IF;
    END;
    
  ELSE
    RAISE NOTICE '✅ No consolidation needed for profiles tables';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: CONSOLIDATE ACCOUNTS VS ACCOUNTS_V2
-- =============================================================================

-- Check if both accounts and accounts_v2 exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts_v2' AND table_schema = 'public') THEN
    
    RAISE NOTICE '🚨 CONSOLIDATION NEEDED: accounts and accounts_v2 both exist';
    RAISE NOTICE '   Analyzing table structures...';
    
    -- Check row counts in both tables
    DECLARE
      accounts_count INTEGER;
      accounts_v2_count INTEGER;
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM accounts' INTO accounts_count;
      EXECUTE 'SELECT COUNT(*) FROM accounts_v2' INTO accounts_v2_count;
      
      RAISE NOTICE '   accounts table: % rows', accounts_count;
      RAISE NOTICE '   accounts_v2 table: % rows', accounts_v2_count;
      
      -- Recommend which table to keep based on data
      IF accounts_v2_count > accounts_count THEN
        RAISE NOTICE '   RECOMMENDATION: Keep accounts_v2 (more data), migrate from accounts';
      ELSE
        RAISE NOTICE '   RECOMMENDATION: Keep accounts (more data), migrate from accounts_v2';
      END IF;
    END;
    
  ELSE
    RAISE NOTICE '✅ No consolidation needed for accounts tables';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: IDENTIFY ALL TABLES NEEDING CONSOLIDATION
-- =============================================================================

-- Generate comprehensive consolidation report
SELECT 
  'CONSOLIDATION INVENTORY' as info_type,
  table_name,
  CASE 
    WHEN table_name LIKE '%_v2' THEN '🚨 V2 Version - Consolidate'
    WHEN table_name LIKE '%_old' THEN '🚨 Old Version - Consolidate'
    WHEN table_name LIKE '%_backup' THEN '🚨 Backup Version - Consolidate'
    WHEN table_name LIKE '%_temp' THEN '🚨 Temp Version - Consolidate'
    WHEN table_name LIKE '%_copy' THEN '🚨 Copy Version - Consolidate'
    WHEN table_name LIKE '%_new' THEN '🚨 New Version - Consolidate'
    ELSE '✅ Standard Table'
  END as consolidation_status,
  CASE 
    WHEN table_name LIKE '%_v2' THEN 'Migrate to base table, then drop'
    WHEN table_name LIKE '%_old' THEN 'Migrate to base table, then drop'
    WHEN table_name LIKE '%_backup' THEN 'Migrate to base table, then drop'
    WHEN table_name LIKE '%_temp' THEN 'Migrate to base table, then drop'
    WHEN table_name LIKE '%_copy' THEN 'Migrate to base table, then drop'
    WHEN table_name LIKE '%_new' THEN 'Migrate to base table, then drop'
    ELSE 'No action needed'
  END as action_required
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%_v2' OR 
    table_name LIKE '%_old' OR 
    table_name LIKE '%_backup' OR
    table_name LIKE '%_temp' OR
    table_name LIKE '%_copy' OR
    table_name LIKE '%_new'
  )
ORDER BY 
  CASE 
    WHEN table_name LIKE '%_v2' THEN 1
    WHEN table_name LIKE '%_old' THEN 2
    WHEN table_name LIKE '%_backup' THEN 3
    WHEN table_name LIKE '%_temp' THEN 4
    WHEN table_name LIKE '%_copy' THEN 5
    WHEN table_name LIKE '%_new' THEN 6
    ELSE 7
  END,
  table_name;

-- =============================================================================
-- STEP 5: GENERATE CONSOLIDATION EXECUTION PLAN
-- =============================================================================

-- Create detailed execution plan
SELECT 
  'EXECUTION PLAN' as info_type,
  'Phase 3 Consolidation Steps' as plan_type,
  '1. Analyze table structures and data' as step_1,
  '2. Create migration scripts for each duplicate' as step_2,
  '3. Execute data migration safely' as step_3,
  '4. Verify data integrity after migration' as step_4,
  '5. Drop duplicate table versions' as step_5,
  '6. Update any remaining references' as step_6,
  'Ready for detailed consolidation' as status
FROM (SELECT 1) as dummy;

-- =============================================================================
-- STEP 6: PHASE 3 CONSOLIDATION SUMMARY
-- =============================================================================

-- Generate summary of consolidation needs
SELECT 
  'PHASE 3 CONSOLIDATION SUMMARY' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as v2_tables,
  COUNT(CASE WHEN table_name LIKE '%_old' THEN 1 END) as old_tables,
  COUNT(CASE WHEN table_name LIKE '%_backup' THEN 1 END) as backup_tables,
  COUNT(CASE WHEN table_name LIKE '%_temp' THEN 1 END) as temp_tables,
  COUNT(CASE WHEN table_name LIKE '%_copy' THEN 1 END) as copy_tables,
  COUNT(CASE WHEN table_name LIKE '%_new' THEN 1 END) as new_tables,
  'Consolidation Analysis Complete' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%_v2' OR 
    table_name LIKE '%_old' OR 
    table_name LIKE '%_backup' OR
    table_name LIKE '%_temp' OR
    table_name LIKE '%_copy' OR
    table_name LIKE '%_new'
  );

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT ANALYZES WHICH TABLES NEED CONSOLIDATION
-- 2. IT PROVIDES RECOMMENDATIONS FOR EACH DUPLICATE SCENARIO
-- 3. IT GENERATES A COMPREHENSIVE CONSOLIDATION INVENTORY
-- 4. IT DOES NOT EXECUTE CONSOLIDATIONS - ONLY ANALYSIS
-- 5. IT GIVES YOU A CLEAR PLAN FOR EXECUTING CONSOLIDATIONS
--
-- AFTER RUNNING THIS SCRIPT:
-- - Review the consolidation inventory
-- - Plan migration strategy for each duplicate
-- - Create specific migration scripts for each scenario
-- - Execute consolidations one at a time
-- - Proceed to Phase 4 (Cleanup & Optimization) after consolidation
--
-- =============================================================================
