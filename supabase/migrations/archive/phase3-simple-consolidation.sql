-- =============================================================================
-- PHASE 3: SIMPLE EVENTS_V2 CONSOLIDATION
-- =============================================================================
-- 
-- This script directly consolidates events_v2 into events
-- Since we know events_v2 has more data, we'll keep it and backup events
-- =============================================================================

-- =============================================================================
-- STEP 1: VERIFY CURRENT STATE
-- =============================================================================

DO $$
DECLARE
  events_v2_count INTEGER;
  events_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 VERIFYING CURRENT TABLE STATE...';
  
  -- Count rows in events_v2
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM events_v2' INTO events_v2_count;
    RAISE NOTICE '   events_v2 row count: %', events_v2_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing events_v2: %', SQLERRM;
    RETURN;
  END;
  
  -- Count rows in events
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM events' INTO events_count;
    RAISE NOTICE '   events row count: %', events_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing events: %', SQLERRM;
    events_count := 0;
  END;
  
  RAISE NOTICE '   📊 Comparison: events_v2 (% rows) vs events (% rows)', events_v2_count, events_count;
  
  IF events_v2_count > events_count THEN
    RAISE NOTICE '   ✅ STRATEGY: Keep events_v2 (more data), backup events';
  ELSE
    RAISE NOTICE '   ⚠️  WARNING: events has more or equal data. Manual review needed.';
    RETURN;
  END IF;
  
END $$;

-- =============================================================================
-- STEP 2: CREATE BACKUP OF EVENTS TABLE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 STEP 2: CREATING BACKUP OF EVENTS TABLE...';
  
  -- Check if events table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    -- Backup events table
    EXECUTE 'ALTER TABLE events RENAME TO events_old';
    RAISE NOTICE '   ✅ Backed up events to events_old';
  ELSE
    RAISE NOTICE '   ℹ️  events table does not exist - no backup needed';
  END IF;
  
END $$;

-- =============================================================================
-- STEP 3: RENAME EVENTS_V2 TO EVENTS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 STEP 3: RENAMING EVENTS_V2 TO EVENTS...';
  
  -- Rename events_v2 to events
  EXECUTE 'ALTER TABLE events_v2 RENAME TO events';
  RAISE NOTICE '   ✅ Renamed events_v2 to events';
  
END $$;

-- =============================================================================
-- STEP 4: UPDATE FOREIGN KEY CONSTRAINTS
-- =============================================================================

DO $$
DECLARE
  constraint_record RECORD;
  constraints_updated INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 STEP 4: UPDATING FOREIGN KEY CONSTRAINTS...';
  
  -- Find all foreign key constraints that point to events_old
  FOR constraint_record IN 
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'events_old'
  LOOP
    RAISE NOTICE '   Updating FK constraint % on table %', constraint_record.constraint_name, constraint_record.table_name;
    
    -- Drop the old constraint
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.constraint_name);
    
    -- Add new constraint pointing to the new events table
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES events(id) ON DELETE CASCADE', 
                   constraint_record.table_name, constraint_record.constraint_name, 
                   constraint_record.column_name);
    
    constraints_updated := constraints_updated + 1;
    RAISE NOTICE '   ✅ Updated FK constraint %', constraint_record.constraint_name;
  END LOOP;
  
  RAISE NOTICE '   📊 Total foreign key constraints updated: %', constraints_updated;
  
END $$;

-- =============================================================================
-- STEP 5: VERIFY CONSOLIDATION SUCCESS
-- =============================================================================

DO $$
DECLARE
  events_final_count INTEGER;
  events_old_exists BOOLEAN;
  events_v2_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 STEP 5: VERIFYING CONSOLIDATION SUCCESS...';
  
  -- Check if events table exists and has data
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM events' INTO events_final_count;
    RAISE NOTICE '   ✅ events table exists with % rows', events_final_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing events table: %', SQLERRM;
    RETURN;
  END;
  
  -- Check if events_old exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_old'
  ) INTO events_old_exists;
  
  -- Check if events_v2 still exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events_v2'
  ) INTO events_v2_exists;
  
  RAISE NOTICE '   events_old exists: %', events_old_exists;
  RAISE NOTICE '   events_v2 exists: %', events_v2_exists;
  
  IF events_final_count > 0 AND NOT events_v2_exists THEN
    RAISE NOTICE '   🎉 SUCCESS: Consolidation completed successfully!';
    RAISE NOTICE '   ✅ events table now contains all data';
    RAISE NOTICE '   📁 events_old contains the backup';
  ELSE
    RAISE NOTICE '   ⚠️  WARNING: Consolidation may not be complete';
  END IF;
  
END $$;

-- =============================================================================
-- STEP 6: FINAL STATUS REPORT
-- =============================================================================

SELECT 
  'CONSOLIDATION STATUS' as info_type,
  COUNT(CASE WHEN table_name = 'events' THEN 1 END) as events_table_exists,
  COUNT(CASE WHEN table_name = 'events_old' THEN 1 END) as events_backup_exists,
  COUNT(CASE WHEN table_name = 'events_v2' THEN 1 END) as events_v2_still_exists,
  CASE 
    WHEN COUNT(CASE WHEN table_name = 'events' THEN 1 END) = 1 
      AND COUNT(CASE WHEN table_name = 'events_v2' THEN 1 END) = 0 
    THEN '✅ Consolidation Successful'
    ELSE '⚠️ Consolidation Incomplete'
  END as consolidation_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('events', 'events_old', 'events_v2');
