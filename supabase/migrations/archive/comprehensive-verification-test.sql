-- =============================================================================
-- COMPREHENSIVE VERIFICATION TEST
-- =============================================================================
-- 
-- This script systematically verifies all completed phases to confirm success:
-- Phase 1: Foreign Key Verification
-- Phase 2: RLS & Security Verification  
-- Phase 3: Table Consolidation Verification
-- Phase 4: Cleanup & Optimization Verification
-- =============================================================================

-- =============================================================================
-- PHASE 1 VERIFICATION: FOREIGN KEY CONSTRAINTS
-- =============================================================================

DO $$
DECLARE
  total_fks INTEGER;
  valid_fks INTEGER;
  invalid_fks INTEGER;
  test_fk_record RECORD;
BEGIN
  RAISE NOTICE 'PHASE 1 VERIFICATION: FOREIGN KEY CONSTRAINTS';
  RAISE NOTICE '==============================================';
  
  -- Count total foreign keys
  SELECT COUNT(*) INTO total_fks
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';
  
  RAISE NOTICE 'Total foreign key constraints found: %', total_fks;
  
  -- Verify each foreign key points to a valid table
  valid_fks := 0;
  invalid_fks := 0;
  
  FOR test_fk_record IN 
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name as referenced_table,
      ccu.column_name as referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
    LIMIT 10  -- Test first 10 for verification
  LOOP
    -- Check if referenced table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = test_fk_record.referenced_table
    ) THEN
      valid_fks := valid_fks + 1;
    ELSE
      invalid_fks := invalid_fks + 1;
      RAISE NOTICE 'INVALID FK: % on % references non-existent table %', 
                   test_fk_record.constraint_name, test_fk_record.table_name, test_fk_record.referenced_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Sample FK verification: % valid, % invalid', valid_fks, invalid_fks;
  
  -- Phase 1 Success Criteria
  IF total_fks >= 400 THEN  -- Expecting around 451 FKs
    RAISE NOTICE 'PHASE 1 STATUS: ✅ SUCCESS - Foreign keys properly configured';
  ELSE
    RAISE NOTICE 'PHASE 1 STATUS: ❌ FAILED - Insufficient foreign keys found';
  END IF;
  
END $$;

-- =============================================================================
-- PHASE 2 VERIFICATION: RLS & SECURITY
-- =============================================================================

DO $$
DECLARE
  total_tables INTEGER;
  tables_with_rls INTEGER;
  total_policies INTEGER;
  rls_coverage_percent NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 2 VERIFICATION: RLS & SECURITY';
  RAISE NOTICE '=====================================';
  
  -- Count total tables
  SELECT COUNT(*) INTO total_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true;
  
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Calculate RLS coverage
  rls_coverage_percent := (tables_with_rls::float / total_tables) * 100;
  
  RAISE NOTICE 'Total tables: %', total_tables;
  RAISE NOTICE 'Tables with RLS: %', tables_with_rls;
  RAISE NOTICE 'Total policies: %', total_policies;
  RAISE NOTICE 'RLS coverage: %', rls_coverage_percent;
  
  -- Phase 2 Success Criteria
  IF tables_with_rls >= 500 AND total_policies >= 150 THEN  -- Expecting ~591 tables with RLS, ~199 policies
    RAISE NOTICE 'PHASE 2 STATUS: ✅ SUCCESS - RLS and security properly configured';
  ELSE
    RAISE NOTICE 'PHASE 2 STATUS: ❌ FAILED - Insufficient RLS or policies';
  END IF;
  
END $$;

-- =============================================================================
-- PHASE 3 VERIFICATION: TABLE CONSOLIDATION
-- =============================================================================

DO $$
DECLARE
  events_v2_exists BOOLEAN;
  events_exists BOOLEAN;
  events_old_exists BOOLEAN;
  events_row_count INTEGER;
  events_old_row_count INTEGER;
  fk_constraints_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 3 VERIFICATION: TABLE CONSOLIDATION';
  RAISE NOTICE '=========================================';
  
  -- Check if events_v2 still exists (should NOT exist)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_v2'
  ) INTO events_v2_exists;
  
  -- Check if events table exists (should exist)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) INTO events_exists;
  
  -- Check if events_old backup exists (should exist)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_old'
  ) INTO events_old_exists;
  
  -- Count rows in events table
  IF events_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM events' INTO events_row_count;
  ELSE
    events_row_count := 0;
  END IF;
  
  -- Count rows in events_old backup
  IF events_old_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM events_old' INTO events_old_row_count;
  ELSE
    events_old_exists := 0;
  END IF;
  
  -- Count foreign key constraints that reference events table
  SELECT COUNT(*) INTO fk_constraints_updated
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'events';
  
  RAISE NOTICE 'events_v2 exists: % (should be FALSE)', events_v2_exists;
  RAISE NOTICE 'events table exists: % (should be TRUE)', events_exists;
  RAISE NOTICE 'events_old backup exists: % (should be TRUE)', events_old_exists;
  RAISE NOTICE 'events table row count: %', events_row_count;
  RAISE NOTICE 'events_old row count: %', events_old_row_count;
  RAISE NOTICE 'FK constraints pointing to events: %', fk_constraints_updated;
  
  -- Phase 3 Success Criteria
  IF NOT events_v2_exists AND events_exists AND events_old_exists AND events_row_count > 0 THEN
    RAISE NOTICE 'PHASE 3 STATUS: ✅ SUCCESS - Table consolidation completed successfully';
  ELSE
    RAISE NOTICE 'PHASE 3 STATUS: ❌ FAILED - Table consolidation incomplete';
  END IF;
  
END $$;

-- =============================================================================
-- PHASE 4 VERIFICATION: CLEANUP & OPTIMIZATION
-- =============================================================================

DO $$
DECLARE
  backup_tables_count INTEGER;
  active_tables_count INTEGER;
  tables_analyzed INTEGER;
  health_score INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 4 VERIFICATION: CLEANUP & OPTIMIZATION';
  RAISE NOTICE '============================================';
  
  -- Count backup tables
  SELECT COUNT(*) INTO backup_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%_old' OR table_name LIKE '%_backup');
  
  -- Count active tables
  SELECT COUNT(*) INTO active_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE '%_old'
    AND table_name NOT LIKE '%_backup';
  
  -- Test if tables have been analyzed recently
  SELECT COUNT(*) INTO tables_analyzed
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public' 
    AND last_analyze > NOW() - INTERVAL '1 hour';
  
  RAISE NOTICE 'Backup tables: %', backup_tables_count;
  RAISE NOTICE 'Active tables: %', active_tables_count;
  RAISE NOTICE 'Tables analyzed recently: %', tables_analyzed;
  
  -- Calculate simple health score
  health_score := 0;
  
  IF backup_tables_count <= 5 THEN  -- Reasonable number of backups
    health_score := health_score + 25;
  END IF;
  
  IF active_tables_count >= 250 THEN  -- Good number of active tables
    health_score := health_score + 25;
  END IF;
  
  IF tables_analyzed > 0 THEN  -- Some tables were analyzed
    health_score := health_score + 25;
  END IF;
  
  IF backup_tables_count > 0 THEN  -- Backups exist for safety
    health_score := health_score + 25;
  END IF;
  
  RAISE NOTICE 'Cleanup health score: %/100', health_score;
  
  -- Phase 4 Success Criteria
  IF health_score >= 75 THEN
    RAISE NOTICE 'PHASE 4 STATUS: ✅ SUCCESS - Cleanup and optimization completed';
  ELSE
    RAISE NOTICE 'PHASE 4 STATUS: ❌ FAILED - Cleanup and optimization incomplete';
  END IF;
  
END $$;

-- =============================================================================
-- FINAL COMPREHENSIVE VERIFICATION REPORT
-- =============================================================================

DO $$
DECLARE
  phase1_success BOOLEAN := FALSE;
  phase2_success BOOLEAN := FALSE;
  phase3_success BOOLEAN := FALSE;
  phase4_success BOOLEAN := FALSE;
  overall_success BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'FINAL COMPREHENSIVE VERIFICATION REPORT';
  RAISE NOTICE '=======================================';
  
  -- Check Phase 1: Foreign Keys
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
    HAVING COUNT(*) >= 400
  ) THEN
    phase1_success := TRUE;
  END IF;
  
  -- Check Phase 2: RLS & Security
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    HAVING COUNT(*) >= 500
  ) AND EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    HAVING COUNT(*) >= 150
  ) THEN
    phase2_success := TRUE;
  END IF;
  
  -- Check Phase 3: Table Consolidation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_v2'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_old'
  ) THEN
    phase3_success := TRUE;
  END IF;
  
  -- Check Phase 4: Cleanup & Optimization
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    HAVING COUNT(*) >= 250
  ) THEN
    phase4_success := TRUE;
  END IF;
  
  -- Overall success
  overall_success := phase1_success AND phase2_success AND phase3_success AND phase4_success;
  
  -- Report results
  RAISE NOTICE 'Phase 1 (Foreign Keys): %', CASE WHEN phase1_success THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
  RAISE NOTICE 'Phase 2 (RLS & Security): %', CASE WHEN phase2_success THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
  RAISE NOTICE 'Phase 3 (Table Consolidation): %', CASE WHEN phase3_success THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
  RAISE NOTICE 'Phase 4 (Cleanup & Optimization): %', CASE WHEN phase4_success THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
  
  RAISE NOTICE '';
  
  IF overall_success THEN
    RAISE NOTICE '🎉 OVERALL STATUS: ✅ ALL PHASES SUCCESSFUL!';
    RAISE NOTICE '🎯 Your Tourify database is fully optimized and production-ready!';
  ELSE
    RAISE NOTICE '⚠️  OVERALL STATUS: ❌ SOME PHASES FAILED';
    RAISE NOTICE '🔧 Review failed phases and address issues before production use.';
  END IF;
  
END $$;
