-- =============================================================================
-- PHASE 3: EVENTS_V2 DEPENDENCY ANALYSIS (FINAL CORRECTED)
-- =============================================================================
-- 
-- This script analyzes the complex dependencies on events_v2 table.
-- Execute to understand what needs to be updated before consolidation.
--
-- EXECUTION ORDER:
-- 1. Count total dependencies on events_v2
-- 2. List all foreign key constraints
-- 3. List all RLS policies (using correct columns)
-- 4. Analyze events vs events_v2 data
-- 5. Provide migration recommendations
-- =============================================================================

-- =============================================================================
-- STEP 1: COUNT TOTAL DEPENDENCIES ON EVENTS_V2
-- =============================================================================

-- Count all dependencies on events_v2
SELECT 
  'DEPENDENCY COUNT' as info_type,
  'events_v2 Dependencies' as table_name,
  (
    -- Foreign key constraints
    (SELECT COUNT(*) 
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' 
       AND ccu.table_name = 'events_v2')
    +
    -- RLS Policies (using correct columns)
    (SELECT COUNT(*) 
     FROM pg_policies 
     WHERE schemaname = 'public' 
       AND (tablename = 'events_v2' OR tablename LIKE '%events%'))
  ) as total_dependencies,
  'Need careful migration strategy' as status;

-- =============================================================================
-- STEP 2: LIST ALL FOREIGN KEY CONSTRAINTS ON EVENTS_V2
-- =============================================================================

-- Show all foreign key constraints that reference events_v2
SELECT 
  'FOREIGN KEY CONSTRAINTS' as info_type,
  tc.table_name as dependent_table,
  tc.constraint_name as constraint_name,
  kcu.column_name as foreign_key_column,
  ccu.table_name as referenced_table,
  'Needs FK update' as action_required
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'events_v2'
ORDER BY tc.table_name;

-- =============================================================================
-- STEP 3: LIST ALL RLS POLICIES THAT REFERENCE EVENTS_V2
-- =============================================================================

-- Show all RLS policies that might reference events_v2
-- Using the correct columns that exist in pg_policies
SELECT 
  'RLS POLICIES' as info_type,
  schemaname || '.' || tablename as table_name,
  policyname as policy_name,
  cmd as policy_command,
  'Check if references events_v2' as action_required
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (tablename = 'events_v2' OR tablename LIKE '%events%')
ORDER BY tablename, policyname;

-- =============================================================================
-- STEP 4: ANALYZE EVENTS VS EVENTS_V2 DATA
-- =============================================================================

-- Compare the two tables
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
     JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'events_v2') +
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
     AND (tablename = 'events_v2' OR tablename LIKE '%events%'));
     
END $$;

-- =============================================================================
-- STEP 5: ANSWER USER QUESTION ABOUT CREATING COLUMNS
-- =============================================================================

-- Address the question: "should we be creating these columns as we go because we may need them"
SELECT 
  'COLUMN CREATION STRATEGY' as info_type,
  'Answer to User Question' as question,
  'No - we should NOT create columns as we go' as answer,
  'We should analyze existing schema first' as reason,
  'Then plan migration based on actual needs' as approach
FROM (SELECT 1) as dummy;

-- =============================================================================
-- STEP 6: MIGRATION RECOMMENDATIONS
-- =============================================================================

-- Provide migration recommendations
SELECT 
  'MIGRATION RECOMMENDATIONS' as info_type,
  'Safe Events Consolidation' as plan_type,
  '1. Update all foreign key constraints' as step_1,
  '2. Update all RLS policies' as step_2,
  '3. Verify data consistency' as step_3,
  '4. Execute table consolidation' as step_4,
  '5. Clean up old table' as step_5,
  'Complex migration - manual execution recommended' as status
FROM (SELECT 1) as dummy;

-- =============================================================================
-- STEP 7: PHASE 3 STATUS
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
-- ANSWER TO USER QUESTION:
-- - We should NOT create columns as we go
-- - We should analyze the existing schema first
-- - Then plan migration based on actual needs
-- - This prevents creating unnecessary columns and maintains data integrity
--
-- NEXT STEPS:
-- - Review the dependency analysis
-- - Plan the specific migration steps
-- - Execute migration manually with proper dependency handling
-- - Consider using a staging approach for safety
--
-- =============================================================================
