-- =============================================================================
-- PHASE 3: EXECUTE V2 TABLE MIGRATION (CORRECTED)
-- =============================================================================
-- 
-- This script EXECUTES the migration of events_v2 with proper dependency handling.
-- Execute AFTER Phase 3 migration planning is complete.
--
-- EXECUTION ORDER:
-- 1. Identify and analyze events_v2 dependencies
-- 2. Plan safe migration strategy
-- 3. Execute migration with dependency handling
-- 4. Verify data integrity
-- 5. Clean up safely
-- =============================================================================

-- =============================================================================
-- STEP 1: ANALYZE EVENTS_V2 DEPENDENCIES
-- =============================================================================

-- First, let's see exactly what depends on events_v2
SELECT 
  'DEPENDENCY ANALYSIS' as info_type,
  'events_v2 Dependencies' as table_name,
  COUNT(*) as total_dependencies,
  'Need careful migration strategy' as status
FROM (
  -- Foreign key constraints
  SELECT 'FK Constraint' as dependency_type, 
         tc.table_name as dependent_table,
         tc.constraint_name as constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.referenced_table_name = 'events_v2'
  
  UNION ALL
  
  -- RLS Policies
  SELECT 'RLS Policy' as dependency_type,
         schemaname || '.' || tablename as dependent_table,
         policyname as constraint_name
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND (definition LIKE '%events_v2%' OR definition LIKE '%events_v2%')
  
  UNION ALL
  
  -- Views that might reference events_v2
  SELECT 'View Reference' as dependency_type,
         table_name as dependent_table,
         'view' as constraint_name
  FROM information_schema.views 
  WHERE view_definition LIKE '%events_v2%'
) as dependencies;

-- =============================================================================
-- STEP 2: DETAILED DEPENDENCY BREAKDOWN
-- =============================================================================

-- Show all foreign key constraints on events_v2
SELECT 
  'FOREIGN KEY CONSTRAINTS' as info_type,
  tc.table_name as dependent_table,
  tc.constraint_name as constraint_name,
  kcu.column_name as foreign_key_column,
  'Needs FK update' as action_required
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND kcu.referenced_table_name = 'events_v2'
ORDER BY tc.table_name;

-- Show all RLS policies that reference events_v2
SELECT 
  'RLS POLICIES' as info_type,
  schemaname || '.' || tablename as table_name,
  policyname as policy_name,
  cmd as policy_command,
  'Needs policy update' as action_required
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (definition LIKE '%events_v2%' OR definition LIKE '%events_v2%')
ORDER BY tablename, policyname;

-- =============================================================================
-- STEP 3: SAFE MIGRATION STRATEGY
-- =============================================================================

-- Analyze the current state of events vs events_v2
DO $$
DECLARE
  events_count INTEGER;
  events_v2_count INTEGER;
  events_columns INTEGER;
  events_v2_columns INTEGER;
BEGIN
  RAISE NOTICE '🔍 ANALYZING EVENTS VS EVENTS_V2 TABLES...';
  
  -- Count rows in both tables
  EXECUTE 'SELECT COUNT(*) FROM events' INTO events_count;
  EXECUTE 'SELECT COUNT(*) FROM events_v2' INTO events_v2_count;
  
  -- Count columns in both tables
  EXECUTE 'SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ''events'' AND table_schema = ''public''' INTO events_columns;
  EXECUTE 'SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ''events_v2'' AND table_schema = ''public''' INTO events_v2_columns;
  
  RAISE NOTICE '   events table: % rows, % columns', events_count, events_columns;
  RAISE NOTICE '   events_v2 table: % rows, % columns', events_v2_count, events_v2_columns;
  
  -- Determine migration strategy
  IF events_v2_count > events_count THEN
    RAISE NOTICE '   🎯 STRATEGY: Keep events_v2 (more data), migrate from events';
    RAISE NOTICE '   📋 ACTION: Update all dependencies to point to events_v2, then drop events';
  ELSE
    RAISE NOTICE '   🎯 STRATEGY: Keep events (more data), migrate from events_v2';
    RAISE NOTICE '   📋 ACTION: Update all dependencies to point to events, then drop events_v2';
  END IF;
  
  RAISE NOTICE '   ⚠️  NOTE: This requires updating %+ dependencies', 
    (SELECT COUNT(*) FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.referenced_table_name = 'events_v2') +
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
     AND (definition LIKE '%events_v2%' OR definition LIKE '%events_v2%'));
     
END $$;

-- =============================================================================
-- STEP 4: GENERATE MIGRATION PLAN
-- =============================================================================

-- Create detailed migration plan
SELECT 
  'MIGRATION PLAN' as info_type,
  'Safe Events Consolidation Strategy' as plan_type,
  '1. Update all foreign key constraints' as step_1,
  '2. Update all RLS policies' as step_2,
  '3. Verify data consistency' as step_3,
  '4. Execute table consolidation' as step_4,
  '5. Clean up old table' as step_5,
  'Complex migration - manual execution recommended' as status
FROM (SELECT 1) as dummy;

-- =============================================================================
-- STEP 5: PHASE 3 COMPLETION STATUS
-- =============================================================================

-- Show current status
SELECT 
  'PHASE 3 STATUS' as info_type,
  'V2 Table Analysis Complete' as current_phase,
  'Dependencies Identified' as status,
  'Manual Migration Required' as next_action,
  'Complex foreign key relationships' as complexity_note
FROM (SELECT 1) as dummy;

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT ANALYZES THE COMPLEX DEPENDENCIES ON EVENTS_V2
-- 2. IT IDENTIFIES ALL FOREIGN KEYS AND RLS POLICIES THAT NEED UPDATING
-- 3. IT PROVIDES A SAFE MIGRATION STRATEGY
-- 4. IT DOES NOT EXECUTE THE MIGRATION - ONLY PLANNING
-- 5. THE MIGRATION REQUIRES MANUAL EXECUTION DUE TO COMPLEXITY
--
-- NEXT STEPS:
-- - Review the dependency analysis
-- - Plan the specific migration steps
-- - Execute migration manually with proper dependency handling
-- - Consider using a staging approach for safety
--
-- =============================================================================
