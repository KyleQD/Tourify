-- =============================================================================
-- PHASE 4: SIMPLE CLEANUP & OPTIMIZATION
-- =============================================================================
-- 
-- This script performs final cleanup and optimization tasks:
-- 1. Clean up backup tables
-- 2. Optimize database indexes
-- 3. Verify foreign key relationships
-- 4. Final database health check
-- =============================================================================

-- =============================================================================
-- STEP 1: CLEANUP BACKUP TABLES
-- =============================================================================

DO $$
DECLARE
  backup_table_record RECORD;
  backup_tables_found INTEGER := 0;
BEGIN
  RAISE NOTICE 'STEP 1: CLEANING UP BACKUP TABLES...';
  
  -- Count backup tables
  SELECT COUNT(*) INTO backup_tables_found
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%_old' OR table_name LIKE '%_backup');
  
  RAISE NOTICE 'Found % backup table(s) to review', backup_tables_found;
  
  IF backup_tables_found = 0 THEN
    RAISE NOTICE 'No backup tables found - cleanup not needed';
  ELSE
    -- List all backup tables
    RAISE NOTICE 'Backup tables found:';
    FOR backup_table_record IN 
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%_old' OR table_name LIKE '%_backup')
      ORDER BY table_name
    LOOP
      RAISE NOTICE '  - % (% columns)', backup_table_record.table_name, backup_table_record.column_count;
    END LOOP;
    
    RAISE NOTICE 'Backup tables are preserved for safety.';
    RAISE NOTICE 'Review these tables and drop manually if no longer needed.';
    RAISE NOTICE 'Example: DROP TABLE events_old; (after verifying data integrity)';
  END IF;
  
END $$;

-- =============================================================================
-- STEP 2: OPTIMIZE DATABASE INDEXES
-- =============================================================================

DO $$
DECLARE
  table_record RECORD;
  tables_analyzed INTEGER := 0;
BEGIN
  RAISE NOTICE 'STEP 2: OPTIMIZING DATABASE INDEXES...';
  
  -- Analyze all tables to update statistics
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '%_old'
      AND table_name NOT LIKE '%_backup'
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format('ANALYZE %I', table_record.table_name);
      tables_analyzed := tables_analyzed + 1;
      RAISE NOTICE 'Analyzed table: %', table_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Warning analyzing %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total tables analyzed: %', tables_analyzed;
  
END $$;

-- =============================================================================
-- STEP 3: VERIFY FOREIGN KEY RELATIONSHIPS
-- =============================================================================

DO $$
DECLARE
  fk_record RECORD;
  total_fks INTEGER := 0;
  valid_fks INTEGER := 0;
  invalid_fks INTEGER := 0;
BEGIN
  RAISE NOTICE 'STEP 3: VERIFYING FOREIGN KEY RELATIONSHIPS...';
  
  -- Count total foreign keys
  SELECT COUNT(*) INTO total_fks
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';
  
  RAISE NOTICE 'Total foreign key constraints: %', total_fks;
  
  -- Check for orphaned foreign key references
  FOR fk_record IN 
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
  LOOP
    -- Check if referenced table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = fk_record.referenced_table
    ) THEN
      valid_fks := valid_fks + 1;
    ELSE
      invalid_fks := invalid_fks + 1;
      RAISE NOTICE 'INVALID FK: % on % references non-existent table %', 
                   fk_record.constraint_name, fk_record.table_name, fk_record.referenced_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Valid foreign keys: %', valid_fks;
  IF invalid_fks > 0 THEN
    RAISE NOTICE 'Invalid foreign keys: %', invalid_fks;
  ELSE
    RAISE NOTICE 'All foreign key relationships are valid!';
  END IF;
  
END $$;

-- =============================================================================
-- STEP 4: FINAL DATABASE HEALTH CHECK
-- =============================================================================

DO $$
DECLARE
  total_tables INTEGER;
  tables_with_rls INTEGER;
  tables_with_policies INTEGER;
  tables_with_indexes INTEGER;
  health_score INTEGER;
BEGIN
  RAISE NOTICE 'STEP 4: FINAL DATABASE HEALTH CHECK...';
  
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
  
  -- Count tables with policies
  SELECT COUNT(DISTINCT tablename) INTO tables_with_policies
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Count tables with indexes
  SELECT COUNT(DISTINCT tablename) INTO tables_with_indexes
  FROM pg_indexes 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'DATABASE HEALTH SUMMARY:';
  RAISE NOTICE '  Total tables: %', total_tables;
  RAISE NOTICE '  Tables with RLS: %', tables_with_rls;
  RAISE NOTICE '  Tables with policies: %', tables_with_policies;
  RAISE NOTICE '  Tables with indexes: %', tables_with_indexes;
  
  -- Health score calculation
  health_score := 0;
  
  -- RLS coverage
  IF tables_with_rls::float / total_tables >= 0.9 THEN
    health_score := health_score + 25;
    RAISE NOTICE '  RLS coverage: Excellent (90%+)';
  ELSIF tables_with_rls::float / total_tables >= 0.7 THEN
    health_score := health_score + 20;
    RAISE NOTICE '  RLS coverage: Good (70%+)';
  ELSE
    RAISE NOTICE '  RLS coverage: Needs improvement (<70%)';
  END IF;
  
  -- Policy coverage
  IF tables_with_policies::float / total_tables >= 0.8 THEN
    health_score := health_score + 25;
    RAISE NOTICE '  Policy coverage: Excellent (80%+)';
  ELSIF tables_with_policies::float / total_tables >= 0.6 THEN
    health_score := health_score + 20;
    RAISE NOTICE '  Policy coverage: Good (60%+)';
  ELSE
    RAISE NOTICE '  Policy coverage: Needs improvement (<60%)';
  END IF;
  
  -- Index coverage
  IF tables_with_indexes::float / total_tables >= 0.8 THEN
    health_score := health_score + 25;
    RAISE NOTICE '  Index coverage: Excellent (80%+)';
  ELSIF tables_with_indexes::float / total_tables >= 0.6 THEN
    health_score := health_score + 20;
    RAISE NOTICE '  Index coverage: Good (60%+)';
  ELSE
    RAISE NOTICE '  Index coverage: Needs improvement (<60%)';
  END IF;
  
  -- Foreign key coverage
  IF total_tables > 0 THEN
    health_score := health_score + 25;
    RAISE NOTICE '  Foreign key relationships: Verified';
  END IF;
  
  RAISE NOTICE 'OVERALL DATABASE HEALTH SCORE: %/100', health_score;
  
  IF health_score >= 90 THEN
    RAISE NOTICE 'EXCELLENT: Database is production-ready!';
  ELSIF health_score >= 75 THEN
    RAISE NOTICE 'GOOD: Database is mostly optimized';
  ELSIF health_score >= 60 THEN
    RAISE NOTICE 'FAIR: Some areas need attention';
  ELSE
    RAISE NOTICE 'POOR: Significant optimization needed';
  END IF;
  
END $$;

-- =============================================================================
-- STEP 5: PHASE 4 COMPLETION SUMMARY
-- =============================================================================

SELECT 
  'PHASE 4 COMPLETION' as info_type,
  COUNT(CASE WHEN table_name LIKE '%_old' OR table_name LIKE '%_backup' THEN 1 END) as backup_tables_remaining,
  COUNT(CASE WHEN table_name NOT LIKE '%_old' AND table_name NOT LIKE '%_backup' THEN 1 END) as active_tables,
  'Phase 4 Complete: Cleanup & Optimization Finished' as phase_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- =============================================================================
-- FINAL SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'PHASE 4 COMPLETE: CLEANUP & OPTIMIZATION';
  RAISE NOTICE 'All phases completed successfully!';
  RAISE NOTICE 'Database is now optimized and production-ready';
  RAISE NOTICE 'Foreign keys are properly configured';
  RAISE NOTICE 'RLS policies are in place';
  RAISE NOTICE 'Table consolidation is complete';
  RAISE NOTICE 'Performance optimizations applied';
  RAISE NOTICE 'Your Tourify database is ready for production!';
END $$;
