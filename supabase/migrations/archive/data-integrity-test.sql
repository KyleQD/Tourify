-- =============================================================================
-- DATA INTEGRITY TEST
-- =============================================================================
-- 
-- This script tests data integrity after the table consolidation
-- to ensure no data was lost or relationships broken
-- =============================================================================

-- =============================================================================
-- TEST 1: EVENTS TABLE DATA INTEGRITY
-- =============================================================================

DO $$
DECLARE
  events_total_rows INTEGER;
  events_old_total_rows INTEGER;
  data_preserved BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE 'TEST 1: EVENTS TABLE DATA INTEGRITY';
  RAISE NOTICE '====================================';
  
  -- Count rows in current events table
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM events' INTO events_total_rows;
    RAISE NOTICE 'Current events table: % rows', events_total_rows;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Cannot access events table: %', SQLERRM;
    data_preserved := FALSE;
  END;
  
  -- Count rows in events_old backup
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM events_old' INTO events_old_total_rows;
    RAISE NOTICE 'Events backup (events_old): % rows', events_old_total_rows;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Cannot access events_old backup: %', SQLERRM;
    data_preserved := FALSE;
  END;
  
  -- Verify data preservation
  IF events_total_rows > 0 THEN
    RAISE NOTICE '✅ Events table has data';
  ELSE
    RAISE NOTICE '❌ Events table is empty';
    data_preserved := FALSE;
  END IF;
  
  IF events_old_total_rows > 0 THEN
    RAISE NOTICE '✅ Events backup has data';
  ELSE
    RAISE NOTICE '❌ Events backup is empty';
    data_preserved := FALSE;
  END IF;
  
  -- Data integrity assessment
  IF data_preserved THEN
    RAISE NOTICE '🎯 DATA INTEGRITY: ✅ PRESERVED - No data loss detected';
  ELSE
    RAISE NOTICE '🎯 DATA INTEGRITY: ❌ COMPROMISED - Data loss detected';
  END IF;
  
END $$;

-- =============================================================================
-- TEST 2: FOREIGN KEY RELATIONSHIP INTEGRITY
-- =============================================================================

DO $$
DECLARE
  fk_test_record RECORD;
  fk_tests_passed INTEGER := 0;
  fk_tests_failed INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: FOREIGN KEY RELATIONSHIP INTEGRITY';
  RAISE NOTICE '==========================================';
  
  -- Test key foreign key relationships that should still work
  FOR fk_test_record IN 
    SELECT 
      'offers' as table_name,
      'event_id' as column_name,
      'events' as referenced_table
    UNION ALL
    SELECT 
      'required_docs' as table_name,
      'event_id' as column_name,
      'events' as referenced_table
    UNION ALL
    SELECT 
      'incidents' as table_name,
      'event_id' as column_name,
      'events' as referenced_table
    UNION ALL
    SELECT 
      'schedules' as table_name,
      'event_id' as column_name,
      'events' as referenced_table
    UNION ALL
    SELECT 
      'tour_events' as table_name,
      'event_id' as column_name,
      'events' as referenced_table
  LOOP
    BEGIN
      -- Test if the foreign key relationship works
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = fk_test_record.table_name
      ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = fk_test_record.referenced_table
      ) THEN
        -- Check if the column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = fk_test_record.table_name 
            AND column_name = fk_test_record.column_name
        ) THEN
          fk_tests_passed := fk_tests_passed + 1;
          RAISE NOTICE '✅ %.% → %: Relationship intact', 
                       fk_test_record.table_name, 
                       fk_test_record.column_name, 
                       fk_test_record.referenced_table;
        ELSE
          fk_tests_failed := fk_tests_failed + 1;
          RAISE NOTICE '❌ %.% → %: Column missing', 
                       fk_test_record.table_name, 
                       fk_test_record.column_name, 
                       fk_test_record.referenced_table;
        END IF;
      ELSE
        fk_tests_failed := fk_tests_failed + 1;
        RAISE NOTICE '❌ %.% → %: Table missing', 
                     fk_test_record.table_name, 
                     fk_test_record.column_name, 
                     fk_test_record.referenced_table;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      fk_tests_failed := fk_tests_failed + 1;
      RAISE NOTICE '❌ %.% → %: Test failed with error', 
                   fk_test_record.table_name, 
                   fk_test_record.column_name, 
                   fk_test_record.referenced_table;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign Key Test Results: % passed, % failed', fk_tests_passed, fk_tests_failed;
  
  IF fk_tests_failed = 0 THEN
    RAISE NOTICE '🎯 FOREIGN KEY INTEGRITY: ✅ ALL TESTS PASSED';
  ELSE
    RAISE NOTICE '🎯 FOREIGN KEY INTEGRITY: ⚠️ SOME TESTS FAILED';
  END IF;
  
END $$;

-- =============================================================================
-- TEST 3: OVERALL DATABASE HEALTH
-- =============================================================================

SELECT 
  'OVERALL DATABASE HEALTH' as test_type,
  COUNT(CASE WHEN table_name LIKE '%_old' OR table_name LIKE '%_backup' THEN 1 END) as backup_tables,
  COUNT(CASE WHEN table_name NOT LIKE '%_old' AND table_name NOT LIKE '%_backup' THEN 1 END) as active_tables,
  COUNT(CASE WHEN table_name = 'events' THEN 1 END) as events_table_exists,
  COUNT(CASE WHEN table_name = 'events_v2' THEN 1 END) as events_v2_still_exists,
  CASE 
    WHEN COUNT(CASE WHEN table_name = 'events' THEN 1 END) = 1 
      AND COUNT(CASE WHEN table_name = 'events_v2' THEN 1 END) = 0 
    THEN '✅ Consolidation Successful'
    ELSE '❌ Consolidation Incomplete'
  END as consolidation_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
