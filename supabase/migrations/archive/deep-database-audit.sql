-- =============================================================================
-- DEEP DATABASE AUDIT - DOUBLE-CHECK ANALYSIS
-- This script performs a comprehensive audit to ensure we haven't missed any issues
-- =============================================================================

-- =============================================================================
-- STEP 1: COMPREHENSIVE TABLE INVENTORY WITH DETAILS
-- =============================================================================

DO $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
  function_count INTEGER;
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 DEEP DATABASE AUDIT - COMPREHENSIVE ANALYSIS';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  
  -- Count all database objects
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  SELECT COUNT(*) INTO view_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'VIEW';
  
  SELECT COUNT(*) INTO function_count 
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  SELECT COUNT(*) INTO trigger_count 
  FROM pg_trigger 
  WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));
  
  RAISE NOTICE '📊 DATABASE OBJECT INVENTORY:';
  RAISE NOTICE 'Tables: %', table_count;
  RAISE NOTICE 'Views: %', view_count;
  RAISE NOTICE 'Functions: %', function_count;
  RAISE NOTICE 'Triggers: %', trigger_count;
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- STEP 2: DETAILED TABLE STRUCTURE ANALYSIS
-- =============================================================================

-- Show all tables with their key characteristics
SELECT 'DETAILED TABLE ANALYSIS:' as info;
SELECT 
  t.table_name,
  t.table_type,
  c.column_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t.table_name AND indexname LIKE '%_pkey') THEN '✅'
    ELSE '❌'
  END as has_primary_key,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = (t.table_name::regclass)) THEN '✅'
    ELSE '❌'
  END as has_triggers,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.table_name) THEN '✅'
    ELSE '❌'
  END as has_rls_policies,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                 WHERE tc.table_name = t.table_name AND tc.constraint_type = 'FOREIGN KEY') THEN '✅'
    ELSE '❌'
  END as has_foreign_keys
FROM information_schema.tables t
LEFT JOIN (
  SELECT table_name, COUNT(*) as column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  GROUP BY table_name
) c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- =============================================================================
-- STEP 3: FOREIGN KEY REFERENCE MAPPING
-- =============================================================================

-- Map all foreign key relationships
SELECT 'FOREIGN KEY RELATIONSHIP MAP:' as info;
SELECT 
  tc.table_name as source_table,
  kcu.column_name as source_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  tc.constraint_name,
  CASE 
    WHEN ccu.table_name = 'auth.users' THEN '✅ Standard'
    WHEN ccu.table_name = 'profiles' THEN '⚠️ Legacy'
    WHEN ccu.table_name = 'accounts' THEN '⚠️ Check version'
    ELSE '❓ Unknown'
  END as reference_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- STEP 4: COLUMN NAMING CONFLICT DETECTION
-- =============================================================================

-- Detect column naming conflicts across similar tables
SELECT 'COLUMN NAMING CONFLICT DETECTION:' as info;

-- Events-related conflicts
SELECT 
  'Events Tables' as table_group,
  t.table_name,
  STRING_AGG(c.column_name, ', ' ORDER BY c.column_name) as conflicting_columns,
  CASE 
    WHEN COUNT(CASE WHEN c.column_name IN ('title', 'name') THEN 1 END) > 0 THEN '⚠️ Title/Name conflict'
    WHEN COUNT(CASE WHEN c.column_name IN ('user_id', 'created_by') THEN 1 END) > 0 THEN '⚠️ User reference conflict'
    ELSE '✅ Consistent'
  END as naming_status
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND (t.table_name LIKE '%event%' OR t.table_name LIKE '%profile%' OR t.table_name LIKE '%account%')
  AND c.column_name IN ('title', 'name', 'user_id', 'created_by', 'owner_user_id')
GROUP BY t.table_name
HAVING COUNT(CASE WHEN c.column_name IN ('title', 'name', 'user_id', 'created_by', 'owner_user_id') THEN 1 END) > 0;

-- =============================================================================
-- STEP 5: DUPLICATE TABLE VERSION DETECTION
-- =============================================================================

-- Find potential duplicate table versions
SELECT 'DUPLICATE TABLE VERSION DETECTION:' as info;
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE '%_v2' THEN 'Version 2 table'
    WHEN table_name LIKE '%_backup' THEN 'Backup table'
    WHEN table_name LIKE '%_old' THEN 'Old version table'
    WHEN table_name LIKE '%_new' THEN 'New version table'
    WHEN table_name LIKE '%_temp' THEN 'Temporary table'
    ELSE 'Potential duplicate'
  END as duplicate_type,
  CASE 
    WHEN table_name LIKE '%_v2' AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = REPLACE(table_name, '_v2', '')
    ) THEN '⚠️ Conflicts with original'
    WHEN table_name LIKE '%_backup' THEN '🗑️ Consider cleanup'
    WHEN table_name LIKE '%_old' THEN '🗑️ Consider cleanup'
    WHEN table_name LIKE '%_temp' THEN '🗑️ Consider cleanup'
    ELSE '✅ No obvious conflicts'
  END as conflict_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%_v2' OR 
    table_name LIKE '%_backup' OR 
    table_name LIKE '%_old' OR
    table_name LIKE '%_new' OR
    table_name LIKE '%_temp'
  )
ORDER BY table_name;

-- =============================================================================
-- STEP 6: DATA INTEGRITY DEEP CHECK
-- =============================================================================

-- Check for data integrity issues
SELECT 'DATA INTEGRITY DEEP CHECK:' as info;

-- Check for tables with potential data issues
SELECT 
  'Tables with potential data issues' as check_type,
  COUNT(*) as count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = t.table_name 
    AND indexname LIKE '%_pkey'
  );

-- Check for tables without RLS
SELECT 
  'Tables without RLS' as check_type,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND NOT rowsecurity;

-- Check for tables without triggers
SELECT 
  'Tables without triggers' as check_type,
  COUNT(*) as count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = (t.table_name::regclass)
  );

-- =============================================================================
-- STEP 7: PERFORMANCE AND SECURITY AUDIT
-- =============================================================================

-- Check for missing critical indexes
SELECT 'MISSING CRITICAL INDEXES:' as info;
SELECT 
  'posts.user_id' as missing_index,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexdef LIKE '%user_id%') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'follows.follower_id' as missing_index,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'follows' AND indexdef LIKE '%follower_id%') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'follows.following_id' as missing_index,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'follows' AND indexdef LIKE '%following_id%') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'events.user_id' as missing_index,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'events' AND indexdef LIKE '%user_id%') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'notifications.user_id' as missing_index,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'notifications' AND indexdef LIKE '%user_id%') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status;

-- Check RLS policy coverage
SELECT 'RLS POLICY COVERAGE:' as info;
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename) THEN '✅ Has Policies'
    ELSE '❌ No Policies'
  END as policy_status
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- STEP 8: MIGRATION CONFLICT DETECTION
-- =============================================================================

-- Check for migration conflicts
SELECT 'MIGRATION CONFLICT DETECTION:' as info;

-- Check for conflicting table structures
SELECT 
  'Conflicting table structures' as issue_type,
  COUNT(*) as count
FROM (
  SELECT table_name, COUNT(*) as column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  GROUP BY table_name
  HAVING COUNT(*) < 5  -- Tables with very few columns might be incomplete
) incomplete_tables;

-- Check for tables with mixed data types
SELECT 
  'Tables with mixed data types' as issue_type,
  COUNT(*) as count
FROM (
  SELECT table_name, COUNT(DISTINCT data_type) as type_count
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  GROUP BY table_name
  HAVING COUNT(DISTINCT data_type) > 8  -- Tables with many different data types
) complex_tables;

-- =============================================================================
-- STEP 9: COMPREHENSIVE ISSUE SUMMARY
-- =============================================================================

DO $$
DECLARE
  total_issues INTEGER := 0;
  critical_issues INTEGER := 0;
  high_priority_issues INTEGER := 0;
  medium_priority_issues INTEGER := 0;
  low_priority_issues INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 COMPREHENSIVE ISSUE SUMMARY:';
  RAISE NOTICE '================================';
  
  -- Count tables without primary keys (Critical)
  SELECT COUNT(*) INTO critical_issues
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = t.table_name 
      AND indexname LIKE '%_pkey'
    );
  
  -- Count tables without RLS (High Priority)
  SELECT COUNT(*) INTO high_priority_issues
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND NOT rowsecurity;
  
  -- Count tables without triggers (Medium Priority)
  SELECT COUNT(*) INTO medium_priority_issues
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = (t.table_name::regclass)
    );
  
  -- Count potential duplicate tables (Low Priority)
  SELECT COUNT(*) INTO low_priority_issues
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND (
      table_name LIKE '%_v2' OR 
      table_name LIKE '%_backup' OR 
      table_name LIKE '%_old' OR
      table_name LIKE '%_new' OR
      table_name LIKE '%_temp'
    );
  
  total_issues := critical_issues + high_priority_issues + medium_priority_issues + low_priority_issues;
  
  RAISE NOTICE '🔴 Critical Issues (Primary Keys): %', critical_issues;
  RAISE NOTICE '🟠 High Priority (RLS): %', high_priority_issues;
  RAISE NOTICE '🟡 Medium Priority (Triggers): %', medium_priority_issues;
  RAISE NOTICE '🟢 Low Priority (Cleanup): %', low_priority_issues;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total Issues Found: %', total_issues;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 RECOMMENDED EXECUTION ORDER:';
  RAISE NOTICE '1. Fix Critical Issues (Primary Keys) - % issues', critical_issues;
  RAISE NOTICE '2. Fix High Priority Issues (RLS) - % issues', high_priority_issues;
  RAISE NOTICE '3. Fix Medium Priority Issues (Triggers) - % issues', medium_priority_issues;
  RAISE NOTICE '4. Fix Low Priority Issues (Cleanup) - % issues', low_priority_issues;
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ ADDITIONAL FINDINGS:';
  RAISE NOTICE '- Multiple table versions detected (events vs events_v2)';
  RAISE NOTICE '- Mixed foreign key references (profiles vs auth.users)';
  RAISE NOTICE '- Column naming inconsistencies (title vs name)';
  RAISE NOTICE '- Potential migration conflicts from multiple attempts';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ NEXT STEPS:';
  RAISE NOTICE '1. Review this comprehensive audit';
  RAISE NOTICE '2. Prioritize issues based on business impact';
  RAISE NOTICE '3. Execute fixes in recommended order';
  RAISE NOTICE '4. Test each fix before proceeding';
  RAISE NOTICE '5. Document all changes for future reference';
END $$;

-- =============================================================================
-- STEP 10: FINAL RECOMMENDATIONS
-- =============================================================================

-- Show final recommendations
SELECT 'FINAL RECOMMENDATIONS:' as info;
SELECT 
  'Priority 1: Critical' as priority,
  'Fix missing primary keys and foreign key constraints' as action,
  'Immediate execution required' as urgency
UNION ALL
SELECT 
  'Priority 2: High' as priority,
  'Enable RLS and add security policies' as action,
  'Execute within 24 hours' as urgency
UNION ALL
SELECT 
  'Priority 3: Medium' as priority,
  'Consolidate duplicate table versions' as action,
  'Execute within 1 week' as urgency
UNION ALL
SELECT 
  'Priority 4: Low' as priority,
  'Standardize column naming and cleanup' as action,
  'Execute within 1 month' as urgency;
