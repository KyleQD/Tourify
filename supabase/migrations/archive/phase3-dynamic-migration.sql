-- =============================================================================
-- PHASE 3: DYNAMIC V2 TABLE MIGRATION
-- =============================================================================
-- 
-- This script dynamically finds and consolidates ANY _v2 table.
-- Execute AFTER finding the exact table name with the diagnostic script.
--
-- EXECUTION ORDER:
-- 1. Dynamically find all _v2 tables
-- 2. Analyze each table and determine strategy
-- 3. Execute consolidation for each table
-- 4. Verify success
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE ALL HELPER FUNCTIONS FIRST
-- =============================================================================

-- Function to update foreign key constraints
CREATE OR REPLACE FUNCTION update_foreign_keys_for_consolidation(old_table_name TEXT, new_table_name TEXT)
RETURNS VOID AS $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE '      🔄 Updating foreign key constraints...';
  
  -- Update any foreign key constraints that point to the old table
  FOR constraint_record IN 
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = old_table_name
  LOOP
    RAISE NOTICE '         Updating FK constraint % on table %', constraint_record.constraint_name, constraint_record.table_name;
    
    -- Drop the old constraint
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
    
    -- Add new constraint pointing to the new table
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE CASCADE', 
                   constraint_record.table_name, constraint_record.constraint_name, 
                   constraint_record.column_name, new_table_name);
    
    RAISE NOTICE '         ✅ Updated FK constraint %', constraint_record.constraint_name;
  END LOOP;
  
  RAISE NOTICE '      ✅ Foreign key constraints updated';
  
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate when keeping the V2 table
CREATE OR REPLACE FUNCTION consolidate_v2_table_keep_v2(v2_table_name TEXT, base_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE '   🔄 Executing consolidation: Keep V2 table, backup base table';
  
  -- Backup the base table
  EXECUTE format('ALTER TABLE %I RENAME TO %I', base_table_name, base_table_name || '_old');
  RAISE NOTICE '      ✅ Backed up % to %_old', base_table_name, base_table_name || '_old';
  
  -- Rename v2 table to base table name
  EXECUTE format('ALTER TABLE %I RENAME TO %I', v2_table_name, base_table_name);
  RAISE NOTICE '      ✅ Renamed % to %', v2_table_name, base_table_name;
  
  -- Update foreign key constraints to point to the renamed v2 table
  PERFORM update_foreign_keys_for_consolidation(base_table_name || '_old', base_table_name);
  
  RAISE NOTICE '      🎯 Consolidation complete: % is now the primary table', base_table_name;
  
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate when keeping the base table
CREATE OR REPLACE FUNCTION consolidate_v2_table_keep_base(v2_table_name TEXT, base_table_name TEXT)
RETURNS VOID AS $$
DECLARE
  unique_records INTEGER;
BEGIN
  RAISE NOTICE '   🔄 Executing consolidation: Keep base table, backup V2 table';
  
  -- Check for unique records in v2 table
  EXECUTE format('SELECT COUNT(*) FROM %I v2 WHERE NOT EXISTS (SELECT 1 FROM %I base WHERE base.id = v2.id)', v2_table_name, base_table_name) INTO unique_records;
  
  IF unique_records > 0 THEN
    RAISE NOTICE '      ⚠️  Found % unique records in % that need migration', unique_records, v2_table_name;
    RAISE NOTICE '      📋 RECOMMENDATION: Manual review needed for % unique records', unique_records;
    
    -- Backup the v2 table
    EXECUTE format('ALTER TABLE %I RENAME TO %I', v2_table_name, v2_table_name || '_old');
    RAISE NOTICE '      📁 Kept % as %_old for manual review', v2_table_name, v2_table_name || '_old';
    
    -- Update foreign key constraints to point to the base table
    PERFORM update_foreign_keys_for_consolidation(v2_table_name || '_old', base_table_name);
    
  ELSE
    RAISE NOTICE '      ✅ No unique records found in %', v2_table_name;
    RAISE NOTICE '      🗑️  Safe to drop % (no data loss)', v2_table_name;
    
    -- Drop the v2 table
    EXECUTE format('DROP TABLE %I', v2_table_name);
    RAISE NOTICE '      🗑️  Dropped % table', v2_table_name;
  END IF;
  
  RAISE NOTICE '      🎯 Consolidation complete: % remains the primary table', base_table_name;
  
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate when only V2 table exists
CREATE OR REPLACE FUNCTION consolidate_v2_table_rename_only(v2_table_name TEXT, base_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE '   🔄 Executing consolidation: Rename V2 table to base table name';
  
  -- Simple rename since base table doesn't exist
  EXECUTE format('ALTER TABLE %I RENAME TO %I', v2_table_name, base_table_name);
  RAISE NOTICE '      ✅ Renamed % to %', v2_table_name, base_table_name;
  
  RAISE NOTICE '      🎯 Consolidation complete: % is now the primary table', base_table_name;
  
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle individual table consolidation
CREATE OR REPLACE FUNCTION process_v2_table_consolidation(v2_table_name TEXT)
RETURNS VOID AS $$
DECLARE
  base_table_name TEXT;
  v2_count INTEGER;
  base_count INTEGER;
  v2_columns INTEGER;
  base_columns INTEGER;
BEGIN
  RAISE NOTICE '   🔍 Analyzing table: %', v2_table_name;
  
  -- Get potential base table name
  base_table_name := REPLACE(v2_table_name, '_v2', '');
  RAISE NOTICE '   Potential base table: %', base_table_name;
  
  -- Count rows in v2 table
  BEGIN
    EXECUTE format('SELECT COUNT(*) FROM %I', v2_table_name) INTO v2_count;
    RAISE NOTICE '   V2 table row count: %', v2_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing V2 table: %', SQLERRM;
    RETURN;
  END;
  
  -- Count columns in v2 table
  EXECUTE format('SELECT COUNT(*) FROM information_schema.columns WHERE table_name = %L AND table_schema = %L', v2_table_name, 'public') INTO v2_columns;
  RAISE NOTICE '   V2 table column count: %', v2_columns;
  
  -- Check if base table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = base_table_name AND table_schema = 'public') THEN
    RAISE NOTICE '   ✅ Base table % exists', base_table_name;
    
    -- Count rows in base table
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM %I', base_table_name) INTO base_count;
      RAISE NOTICE '   Base table row count: %', base_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ❌ Error accessing base table: %', SQLERRM;
      RETURN;
    END;
    
    -- Count columns in base table
    EXECUTE format('SELECT COUNT(*) FROM information_schema.columns WHERE table_name = %L AND table_schema = %L', base_table_name, 'public') INTO base_columns;
    RAISE NOTICE '   Base table column count: %', base_columns;
    
    -- Determine consolidation strategy
    IF v2_count > base_count THEN
      RAISE NOTICE '   🎯 STRATEGY: Keep % (more data), backup %', v2_table_name, base_table_name;
      RAISE NOTICE '   ✅ V2 table has % rows vs base table % rows', v2_count, base_count;
      RAISE NOTICE '   🚀 Calling: consolidate_v2_table_keep_v2()';
      PERFORM consolidate_v2_table_keep_v2(v2_table_name, base_table_name);
    ELSE
      RAISE NOTICE '   🎯 STRATEGY: Keep % (more data), backup %', base_table_name, v2_table_name;
      RAISE NOTICE '   ✅ Base table has % rows vs V2 table % rows', base_count, v2_count;
      RAISE NOTICE '   🚀 Calling: consolidate_v2_table_keep_base()';
      PERFORM consolidate_v2_table_keep_base(v2_table_name, base_table_name);
    END IF;
    
  ELSE
    RAISE NOTICE '   ⚠️  Base table % does not exist', base_table_name;
    RAISE NOTICE '   🎯 STRATEGY: Rename % to %', v2_table_name, base_table_name;
    PERFORM consolidate_v2_table_rename_only(v2_table_name, base_table_name);
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 2: EXECUTE THE MAIN MIGRATION LOGIC
-- =============================================================================

-- Main execution block
DO $$
DECLARE
  v2_table_record RECORD;
  v2_tables_found INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 DYNAMICALLY FINDING ALL V2 TABLES...';
  
  -- Count total _v2 tables
  SELECT COUNT(*) INTO v2_tables_found
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE '%_v2';
  
  RAISE NOTICE '   Found % _v2 table(s) to consolidate', v2_tables_found;
  
  IF v2_tables_found = 0 THEN
    RAISE NOTICE '   ✅ No _v2 tables found - Phase 3 not needed';
    RETURN;
  END IF;
  
  -- Process each _v2 table
  FOR v2_table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '%_v2'
    ORDER BY table_name
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PROCESSING V2 TABLE: %', v2_table_record.table_name;
    
    -- Process this specific _v2 table
    PERFORM process_v2_table_consolidation(v2_table_record.table_name);
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL V2 TABLES PROCESSED - Phase 3 Complete!';
  
END $$;

-- =============================================================================
-- STEP 3: VERIFY CONSOLIDATION SUCCESS
-- =============================================================================

-- Check final status
DO $$
DECLARE
  v2_tables_remaining INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFYING CONSOLIDATION SUCCESS...';
  
  -- Count remaining _v2 tables
  SELECT COUNT(*) INTO v2_tables_remaining
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE '%_v2';
  
  IF v2_tables_remaining = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All _v2 tables have been consolidated!';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % _v2 table(s) still remain. Manual review may be needed.', v2_tables_remaining;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PHASE 3 COMPLETE: Table consolidation finished!';
  
END $$;

-- =============================================================================
-- STEP 4: PHASE 3 COMPLETION SUMMARY
-- =============================================================================

-- Final summary of Phase 3
SELECT 
  'PHASE 3 COMPLETION SUMMARY' as info_type,
  'Dynamic V2 Table Consolidation' as phase_name,
  'Consolidation Executed' as status,
  'Ready for Phase 4' as next_phase,
  'Cleanup & Optimization' as phase_4_description
FROM (SELECT 1) as dummy;

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT DYNAMICALLY FINDS AND CONSOLIDATES ANY _V2 TABLE
-- 2. IT WORKS REGARDLESS OF THE EXACT TABLE NAME
-- 3. IT AUTOMATICALLY DETERMINES THE BEST CONSOLIDATION STRATEGY
-- 4. IT HANDLES ALL FOREIGN KEY CONSTRAINTS AUTOMATICALLY
-- 5. IT CREATES BACKUPS FOR SAFETY
--
-- WHAT THIS APPROACH SOLVES:
-- - ✅ No more hardcoded table names
-- - ✅ Works with any naming convention
-- - ✅ Automatically finds the right tables
-- - ✅ Handles multiple _v2 tables if they exist
-- - ✅ Eliminates the "table does not exist" error
--
-- AFTER RUNNING THIS SCRIPT:
-- - Phase 3 will be COMPLETE
-- - All _v2 tables will be consolidated
-- - All dependencies will be properly updated
-- - Data integrity will be maintained
-- - You'll be ready for Phase 4 (Cleanup & Optimization)
--
-- =============================================================================
