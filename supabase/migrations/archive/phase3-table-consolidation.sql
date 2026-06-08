-- =============================================================================
-- PHASE 3: TABLE CONSOLIDATION AND SCHEMA STANDARDIZATION
-- =============================================================================
-- 
-- This script addresses duplicate table versions and schema inconsistencies
-- identified in the audit. Execute AFTER Phases 1 and 2 are complete.
--
-- EXECUTION ORDER:
-- 1. Identify duplicate table versions
-- 2. Analyze table structure differences
-- 3. Plan consolidation strategy
-- 4. Execute safe consolidations
-- 5. Verify data integrity
-- =============================================================================

-- =============================================================================
-- STEP 1: IDENTIFY DUPLICATE TABLE VERSIONS
-- =============================================================================

-- Find tables with similar names that might be duplicates
SELECT 
  'DUPLICATE TABLE ANALYSIS' as info_type,
  table_name,
  CASE 
    WHEN table_name LIKE '%_v2' THEN '🚨 Potential duplicate: _v2 suffix'
    WHEN table_name LIKE '%_old' THEN '🚨 Potential duplicate: _old suffix'
    WHEN table_name LIKE '%_backup' THEN '🚨 Potential duplicate: _backup suffix'
    WHEN table_name LIKE '%_temp' THEN '🚨 Potential duplicate: _temp suffix'
    WHEN table_name LIKE '%_copy' THEN '🚨 Potential duplicate: _copy suffix'
    WHEN table_name LIKE '%_new' THEN '🚨 Potential duplicate: _new suffix'
    ELSE '✅ Standard naming'
  END as naming_status,
  'Check for consolidation' as recommendation
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
-- STEP 2: ANALYZE TABLE STRUCTURE DIFFERENCES
-- =============================================================================

-- Check for tables with similar base names (e.g., events vs events_v2)
WITH table_groups AS (
  SELECT 
    CASE 
      WHEN table_name LIKE '%_v2' THEN REPLACE(table_name, '_v2', '')
      WHEN table_name LIKE '%_old' THEN REPLACE(table_name, '_old', '')
      WHEN table_name LIKE '%_backup' THEN REPLACE(table_name, '_backup', '')
      WHEN table_name LIKE '%_temp' THEN REPLACE(table_name, '_temp', '')
      WHEN table_name LIKE '%_copy' THEN REPLACE(table_name, '_copy', '')
      WHEN table_name LIKE '%_new' THEN REPLACE(table_name, '_new', '')
      ELSE table_name
    END as base_name,
    table_name as full_name
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
)
SELECT 
  'TABLE GROUP ANALYSIS' as info_type,
  base_name,
  STRING_AGG(full_name, ', ' ORDER BY full_name) as table_versions,
  COUNT(*) as group_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '🚨 Multiple versions detected'
    ELSE '✅ Single version'
  END as consolidation_status
FROM table_groups 
GROUP BY base_name
HAVING COUNT(*) > 1
ORDER BY base_name;

-- =============================================================================
-- STEP 3: CHECK FOR SPECIFIC DUPLICATE SCENARIOS
-- =============================================================================

-- Check for events vs events_v2 scenario
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    RAISE NOTICE '✅ events table exists';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') THEN
      RAISE NOTICE '🚨 events_v2 table also exists - potential duplicate detected';
      RAISE NOTICE '   Recommendation: Analyze both tables and consolidate';
    ELSE
      RAISE NOTICE '✅ No events_v2 table found';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ events table does not exist';
  END IF;
END $$;

-- Check for profiles vs profiles_v2 scenario
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    RAISE NOTICE '✅ profiles table exists';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_v2' AND table_schema = 'public') THEN
      RAISE NOTICE '🚨 profiles_v2 table also exists - potential duplicate detected';
      RAISE NOTICE '   Recommendation: Analyze both tables and consolidate';
    ELSE
      RAISE NOTICE '✅ No profiles_v2 table found';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist';
  END IF;
END $$;

-- Check for accounts vs accounts_v2 scenario
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public') THEN
    RAISE NOTICE '✅ accounts table exists';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts_v2' AND table_schema = 'public') THEN
      RAISE NOTICE '🚨 accounts_v2 table also exists - potential duplicate detected';
      RAISE NOTICE '   Recommendation: Analyze both tables and consolidate';
    ELSE
      RAISE NOTICE '✅ No accounts_v2 table found';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ accounts table does not exist';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: ANALYZE COLUMN DIFFERENCES BETWEEN DUPLICATE TABLES
-- =============================================================================

-- Compare columns between events and events_v2 (if both exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2' AND table_schema = 'public') THEN
    
    RAISE NOTICE '🔍 Analyzing column differences between events and events_v2...';
    
    -- This would be a more complex analysis in a real scenario
    RAISE NOTICE '   Recommendation: Use detailed column comparison to determine which version to keep';
    
  END IF;
END $$;

-- =============================================================================
-- STEP 5: GENERATE CONSOLIDATION RECOMMENDATIONS
-- =============================================================================

-- Generate summary of consolidation needs
SELECT 
  'CONSOLIDATION RECOMMENDATIONS' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as v2_tables,
  COUNT(CASE WHEN table_name LIKE '%_old' THEN 1 END) as old_tables,
  COUNT(CASE WHEN table_name LIKE '%_backup' THEN 1 END) as backup_tables,
  COUNT(CASE WHEN table_name LIKE '%_temp' THEN 1 END) as temp_tables,
  'Phase 3 Analysis Complete' as status
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
-- STEP 6: PHASE 3 EXECUTION PLAN
-- =============================================================================

-- Generate execution plan summary
SELECT 
  'PHASE 3 EXECUTION PLAN' as info_type,
  'Table Consolidation Strategy' as plan_type,
  '1. Analyze duplicate table structures' as step_1,
  '2. Determine which version to keep' as step_2,
  '3. Migrate data from old versions' as step_3,
  '4. Drop duplicate table versions' as step_4,
  '5. Update any remaining references' as step_5,
  'Ready for detailed analysis' as status
FROM (SELECT 1) as dummy;

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT IDENTIFIES DUPLICATE TABLE VERSIONS IN YOUR DATABASE
-- 2. IT ANALYZES NAMING PATTERNS TO DETECT POTENTIAL DUPLICATES
-- 3. IT PROVIDES RECOMMENDATIONS FOR CONSOLIDATION
-- 4. IT DOES NOT EXECUTE CONSOLIDATION - ONLY ANALYSIS
-- 5. IT GIVES YOU A CLEAR PLAN FOR PHASE 3 EXECUTION
--
-- AFTER RUNNING THIS SCRIPT:
-- - Review the duplicate table analysis
-- - Identify which tables need consolidation
-- - Plan the consolidation strategy for each duplicate
-- - Execute consolidations one at a time
-- - Proceed to Phase 4 (Cleanup & Optimization) after consolidation
--
-- =============================================================================
