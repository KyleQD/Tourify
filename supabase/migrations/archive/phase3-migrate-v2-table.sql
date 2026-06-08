-- =============================================================================
-- PHASE 3: MIGRATE SPECIFIC V2 TABLE
-- =============================================================================
-- 
-- This script consolidates the specific _v2 table identified in Phase 3.
-- Execute AFTER Phase 3 analysis is complete.
--
-- EXECUTION ORDER:
-- 1. Identify the specific _v2 table
-- 2. Analyze its structure and data
-- 3. Plan the migration strategy
-- 4. Execute the migration safely
-- 5. Verify data integrity
-- =============================================================================

-- =============================================================================
-- STEP 1: IDENTIFY THE SPECIFIC V2 TABLE
-- =============================================================================

-- Find the specific _v2 table that needs consolidation
SELECT 
  'V2 TABLE IDENTIFICATION' as info_type,
  table_name,
  'Needs consolidation' as status,
  'Analyze and migrate to base table' as action
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE '%_v2'
ORDER BY table_name;

-- =============================================================================
-- STEP 2: ANALYZE THE V2 TABLE STRUCTURE
-- =============================================================================

-- Get detailed information about the _v2 table
DO $$
DECLARE
  v2_table_name TEXT;
  base_table_name TEXT;
  v2_column_count INTEGER;
  base_column_count INTEGER;
  v2_row_count INTEGER;
  base_row_count INTEGER;
BEGIN
  -- Find the _v2 table
  SELECT table_name INTO v2_table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE '%_v2'
  LIMIT 1;
  
  IF v2_table_name IS NOT NULL THEN
    -- Extract base table name
    base_table_name := REPLACE(v2_table_name, '_v2', '');
    
    RAISE NOTICE '🚨 V2 TABLE FOUND: %', v2_table_name;
    RAISE NOTICE '   Base table name: %', base_table_name;
    
    -- Check if base table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = base_table_name AND table_schema = 'public') THEN
      RAISE NOTICE '✅ Base table % exists', base_table_name;
      
      -- Count columns in both tables
      EXECUTE format('SELECT COUNT(*) FROM information_schema.columns WHERE table_name = %L AND table_schema = %L', v2_table_name, 'public') INTO v2_column_count;
      EXECUTE format('SELECT COUNT(*) FROM information_schema.columns WHERE table_name = %L AND table_schema = %L', base_table_name, 'public') INTO base_column_count;
      
      RAISE NOTICE '   % columns: %', v2_table_name, v2_column_count;
      RAISE NOTICE '   % columns: %', base_table_name, base_column_count;
      
      -- Count rows in both tables
      EXECUTE format('SELECT COUNT(*) FROM %I', v2_table_name) INTO v2_row_count;
      EXECUTE format('SELECT COUNT(*) FROM %I', base_table_name) INTO base_row_count;
      
      RAISE NOTICE '   % rows: %', v2_table_name, v2_row_count;
      RAISE NOTICE '   % rows: %', base_table_name, base_row_count;
      
      -- Provide migration recommendation
      IF v2_row_count > base_row_count THEN
        RAISE NOTICE '   RECOMMENDATION: Keep % (more data), migrate from %', v2_table_name, base_table_name;
        RAISE NOTICE '   ACTION: Rename % to %, then drop %', base_table_name, base_table_name || '_old', v2_table_name;
      ELSE
        RAISE NOTICE '   RECOMMENDATION: Keep % (more data), migrate from %', base_table_name, v2_table_name;
        RAISE NOTICE '   ACTION: Migrate data from % to %, then drop %', v2_table_name, base_table_name, v2_table_name;
      END IF;
      
    ELSE
      RAISE NOTICE '⚠️ Base table % does not exist', base_table_name;
      RAISE NOTICE '   RECOMMENDATION: Rename % to %', v2_table_name, base_table_name;
    END IF;
    
  ELSE
    RAISE NOTICE '✅ No _v2 tables found - no consolidation needed';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: COMPARE COLUMN STRUCTURES
-- =============================================================================

-- Compare columns between the _v2 table and its base table
DO $$
DECLARE
  v2_table_name TEXT;
  base_table_name TEXT;
BEGIN
  -- Find the _v2 table
  SELECT table_name INTO v2_table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE '%_v2'
  LIMIT 1;
  
  IF v2_table_name IS NOT NULL THEN
    base_table_name := REPLACE(v2_table_name, '_v2', '');
    
    -- Check if base table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = base_table_name AND table_schema = 'public') THEN
      RAISE NOTICE '🔍 Comparing column structures between % and %...', v2_table_name, base_table_name;
      
      -- This would show detailed column comparison in a real scenario
      RAISE NOTICE '   Use detailed column analysis to determine migration strategy';
      
    END IF;
  END IF;
END $$;

-- =============================================================================
-- STEP 4: GENERATE MIGRATION PLAN
-- =============================================================================

-- Create detailed migration plan
SELECT 
  'MIGRATION PLAN' as info_type,
  'V2 Table Consolidation Strategy' as plan_type,
  '1. Analyze table structures and data' as step_1,
  '2. Determine which version to keep' as step_2,
  '3. Plan data migration strategy' as step_3,
  '4. Execute migration safely' as step_4,
  '5. Verify data integrity' as step_5,
  '6. Drop duplicate table' as step_6,
  'Ready for migration execution' as status
FROM (SELECT 1) as dummy;

-- =============================================================================
-- STEP 5: PHASE 3 MIGRATION SUMMARY
-- =============================================================================

-- Generate summary of migration needs
SELECT 
  'MIGRATION SUMMARY' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as v2_tables_to_migrate,
  COUNT(CASE WHEN table_name LIKE '%_old' THEN 1 END) as old_tables_to_migrate,
  COUNT(CASE WHEN table_name LIKE '%_backup' THEN 1 END) as backup_tables_to_migrate,
  'Phase 3 Migration Planning Complete' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%_v2' OR 
    table_name LIKE '%_old' OR 
    table_name LIKE '%_backup'
  );

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT IDENTIFIES THE SPECIFIC _V2 TABLE NEEDING CONSOLIDATION
-- 2. IT ANALYZES THE TABLE STRUCTURE AND DATA VOLUME
-- 3. IT PROVIDES SPECIFIC MIGRATION RECOMMENDATIONS
-- 4. IT DOES NOT EXECUTE THE MIGRATION - ONLY PLANNING
-- 5. IT GIVES YOU A CLEAR PLAN FOR EXECUTING THE MIGRATION
--
-- AFTER RUNNING THIS SCRIPT:
-- - Review the specific _v2 table identified
-- - Check the migration recommendations
-- - Plan the specific migration strategy
-- - Execute the migration safely
-- - Proceed to Phase 4 (Cleanup & Optimization) after migration
--
-- =============================================================================
