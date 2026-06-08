-- =============================================================================
-- FIND EXACT V2 TABLE NAME
-- =============================================================================
-- 
-- This script finds the EXACT name of the _v2 table that needs consolidation.
-- Execute to see the precise table name before migration.
-- =============================================================================

-- =============================================================================
-- STEP 1: FIND ALL TABLES WITH _V2 SUFFIX
-- =============================================================================

-- Show the EXACT names of all _v2 tables
SELECT 
  'EXACT V2 TABLE NAMES' as info_type,
  table_name as exact_table_name,
  table_type,
  'This is the table that needs consolidation' as notes
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE '%_v2'
ORDER BY table_name;

-- =============================================================================
-- STEP 2: FIND ALL TABLES WITH 'EVENT' IN NAME
-- =============================================================================

-- Show all tables that might be events-related
SELECT 
  'ALL EVENT-RELATED TABLES' as info_type,
  table_name as exact_table_name,
  table_type,
  'Check if any of these are the target table' as notes
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%event%' OR 
    table_name LIKE '%Event%' OR
    table_name LIKE '%EVENT%'
  )
ORDER BY table_name;

-- =============================================================================
-- STEP 3: FIND THE BASE TABLE FOR EACH V2 TABLE
-- =============================================================================

-- For each _v2 table, show what the base table name would be
SELECT 
  'V2 TO BASE TABLE MAPPING' as info_type,
  table_name as v2_table_name,
  REPLACE(table_name, '_v2', '') as potential_base_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = REPLACE(t.table_name, '_v2', '') AND table_schema = 'public')
    THEN '✅ Base table exists'
    ELSE '❌ Base table does not exist'
  END as base_table_status
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE '%_v2'
ORDER BY table_name;

-- =============================================================================
-- STEP 4: DETAILED TABLE ANALYSIS
-- =============================================================================

-- For each _v2 table, show detailed information
DO $$
DECLARE
  v2_table_record RECORD;
  base_table_name TEXT;
  v2_count INTEGER;
  base_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 DETAILED ANALYSIS OF V2 TABLES...';
  
  FOR v2_table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '%_v2'
    ORDER BY table_name
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '📋 V2 TABLE: %', v2_table_record.table_name;
    
    -- Get potential base table name
    base_table_name := REPLACE(v2_table_record.table_name, '_v2', '');
    RAISE NOTICE '   Potential base table: %', base_table_name;
    
    -- Count rows in v2 table
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM %I', v2_table_record.table_name) INTO v2_count;
      RAISE NOTICE '   V2 table row count: %', v2_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error accessing V2 table: %', SQLERRM;
    END;
    
    -- Check if base table exists and count rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = base_table_name AND table_schema = 'public') THEN
      BEGIN
        EXECUTE format('SELECT COUNT(*) FROM %I', base_table_name) INTO base_count;
        RAISE NOTICE '   Base table row count: %', base_count;
        
        -- Determine consolidation strategy
        IF v2_count > base_count THEN
          RAISE NOTICE '   🎯 STRATEGY: Keep % (more data), backup %', v2_table_record.table_name, base_table_name;
        ELSE
                      RAISE NOTICE '   🎯 STRATEGY: Keep % (more data), backup %', base_table_name, v2_table_record.table_name;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Error accessing base table: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE '   ⚠️  Base table % does not exist', base_table_name;
              RAISE NOTICE '   🎯 STRATEGY: Rename % to %', v2_table_record.table_name, base_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ANALYSIS COMPLETE - Use the exact table names above for migration';
  
END $$;

-- =============================================================================
-- STEP 5: MIGRATION READINESS CHECK
-- =============================================================================

-- Check if we're ready for migration
SELECT 
  'MIGRATION READINESS' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) as v2_tables_found,
  STRING_AGG(CASE WHEN table_name LIKE '%_v2' THEN table_name END, ', ') as v2_table_names,
  CASE 
    WHEN COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) = 0 THEN '❌ No _v2 tables found - Phase 3 not needed'
    WHEN COUNT(CASE WHEN table_name LIKE '%_v2' THEN 1 END) = 1 THEN '✅ Ready for migration - 1 _v2 table found'
    ELSE '⚠️ Multiple _v2 tables found - need individual migration'
  END as migration_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT FINDS THE EXACT NAMES OF ALL _V2 TABLES
-- 2. IT SHOWS THE POTENTIAL BASE TABLE NAMES FOR EACH
-- 3. IT PROVIDES DETAILED ANALYSIS OF EACH TABLE
-- 4. IT DETERMINES THE BEST CONSOLIDATION STRATEGY
-- 5. IT CHECKS IF MIGRATION IS READY
--
-- AFTER RUNNING THIS SCRIPT:
-- - You'll know the EXACT name of the _v2 table
-- - You'll understand the consolidation strategy needed
-- - You'll be ready to run the dynamic migration script
--
-- =============================================================================
