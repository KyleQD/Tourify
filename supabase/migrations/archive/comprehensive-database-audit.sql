-- =============================================================================
-- COMPREHENSIVE DATABASE AUDIT SCRIPT
-- This script systematically identifies all schema inconsistencies, naming conflicts,
-- and structural issues in your Tourify database
-- =============================================================================

-- =============================================================================
-- STEP 1: DATABASE OVERVIEW AND TABLE INVENTORY
-- =============================================================================

DO $$
DECLARE
  table_count INTEGER;
  schema_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 COMPREHENSIVE DATABASE AUDIT STARTING...';
  RAISE NOTICE '===============================================';
  RAISE NOTICE '';
  
  -- Count total tables
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
  
  -- Count schemas
  SELECT COUNT(DISTINCT table_schema) INTO schema_count 
  FROM information_schema.tables;
  
  RAISE NOTICE '📊 DATABASE OVERVIEW:';
  RAISE NOTICE 'Total tables in public schema: %', table_count;
  RAISE NOTICE 'Total schemas: %', schema_count;
  RAISE NOTICE '';
END $$;

-- Show all tables in public schema
SELECT 'ALL TABLES IN PUBLIC SCHEMA:' as info;
SELECT 
  table_name,
  CASE 
    WHEN table_type = 'BASE TABLE' THEN 'Table'
    WHEN table_type = 'VIEW' THEN 'View'
    ELSE table_type
  END as type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = table_name AND indexname LIKE '%_pkey') THEN '✅'
    ELSE '❌'
  END as has_primary_key,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = (table_name::regclass)) THEN '✅'
    ELSE '❌'
  END as has_triggers
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =============================================================================
-- STEP 2: IDENTIFY DUPLICATE/CONFLICTING TABLE STRUCTURES
-- =============================================================================

-- Check for potential duplicate tables (similar names)
SELECT 'POTENTIAL DUPLICATE TABLES:' as info;
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE '%_v2' THEN 'Version 2 table'
    WHEN table_name LIKE '%_backup' THEN 'Backup table'
    WHEN table_name LIKE '%_old' THEN 'Old version table'
    ELSE 'Potential duplicate'
  END as duplicate_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%_v2' OR 
    table_name LIKE '%_backup' OR 
    table_name LIKE '%_old' OR
    table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      GROUP BY table_name 
      HAVING COUNT(*) > 1
    )
  )
ORDER BY table_name;

-- =============================================================================
-- STEP 3: FOREIGN KEY REFERENCE INCONSISTENCIES
-- =============================================================================

-- Check foreign key references to auth.users vs profiles
SELECT 'FOREIGN KEY REFERENCE INCONSISTENCIES:' as info;
SELECT 
  kcu.table_name,
  kcu.column_name,
  tc.constraint_name,
  kcu.column_name as referenced_column,
  ccu.table_name as referenced_table,
  CASE 
    WHEN ccu.table_name = 'auth.users' THEN 'auth.users (correct)'
    WHEN ccu.table_name = 'profiles' THEN 'profiles (potential issue)'
    ELSE ccu.table_name || ' (unknown)'
  END as reference_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (ccu.table_name = 'profiles' OR ccu.table_name = 'auth.users')
ORDER BY kcu.table_name, kcu.column_name;

-- =============================================================================
-- STEP 4: COLUMN NAMING INCONSISTENCIES
-- =============================================================================

-- Check for inconsistent column names across similar tables
SELECT 'COLUMN NAMING INCONSISTENCIES:' as info;

-- Events-related column inconsistencies
SELECT 
  'Events Tables' as table_group,
  t.table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'title') THEN 'title'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'name') THEN 'name'
    ELSE 'neither'
  END as title_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'user_id') THEN 'user_id'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'created_by') THEN 'created_by'
    ELSE 'neither'
  END as user_reference
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name LIKE '%event%'
  AND c.column_name IN ('title', 'name', 'user_id', 'created_by')
GROUP BY t.table_name;

-- =============================================================================
-- STEP 5: MISSING CRITICAL COLUMNS
-- =============================================================================

-- Check for missing critical columns in key tables
SELECT 'MISSING CRITICAL COLUMNS:' as info;

-- Check accounts table
SELECT 
  'accounts' as table_name,
  'follower_count' as missing_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'follower_count') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'accounts' as table_name,
  'post_count' as missing_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'post_count') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'accounts' as table_name,
  'engagement_score' as missing_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'engagement_score') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status;

-- Check events table
SELECT 
  'events' as table_name,
  'user_id' as missing_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_id') THEN '✅ Present'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'events' as table_name,
  'title' as missing_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN '✅ Present'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'name') THEN '✅ Present (as name)'
    ELSE '❌ Missing'
  END as status;

-- =============================================================================
-- STEP 6: ROW LEVEL SECURITY (RLS) STATUS
-- =============================================================================

-- Check RLS status for all tables
SELECT 'ROW LEVEL SECURITY STATUS:' as info;
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename) THEN '✅ Has policies'
    ELSE '❌ No policies'
  END as policies_status
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- STEP 7: TRIGGER AND FUNCTION STATUS
-- =============================================================================

-- Check triggers and functions
SELECT 'TRIGGERS AND FUNCTIONS STATUS:' as info;
SELECT 
  'Triggers' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Active'
    ELSE '❌ None found'
  END as status
FROM pg_trigger
WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
UNION ALL
SELECT 
  'Functions' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Active'
    ELSE '❌ None found'
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =============================================================================
-- STEP 8: DATA INTEGRITY ISSUES
-- =============================================================================

-- Check for orphaned records
SELECT 'POTENTIAL DATA INTEGRITY ISSUES:' as info;

-- Check for orphaned posts (posts without valid user_id)
SELECT 
  'Orphaned Posts' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ Found orphaned posts'
    ELSE '✅ No orphaned posts'
  END as status
FROM posts p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for orphaned events
SELECT 
  'Orphaned Events' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ Found orphaned events'
    ELSE '✅ No orphaned events'
  END as status
FROM events e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Check for orphaned follows
SELECT 
  'Orphaned Follows' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ Found orphaned follows'
    ELSE '✅ No orphaned follows'
  END as status
FROM follows f
LEFT JOIN auth.users u ON f.follower_id = u.id
WHERE u.id IS NULL;

-- =============================================================================
-- STEP 9: INDEX AND PERFORMANCE ISSUES
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
  END as status;

-- =============================================================================
-- STEP 10: MIGRATION CONFLICTS AND VERSION ISSUES
-- =============================================================================

-- Check for migration version conflicts
SELECT 'MIGRATION VERSION CONFLICTS:' as info;
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE '%_v2' THEN 'Version 2 table - check for conflicts with original'
    WHEN table_name LIKE '%_backup' THEN 'Backup table - consider cleanup'
    WHEN table_name LIKE '%_old' THEN 'Old version table - consider cleanup'
    ELSE 'Standard table'
  END as version_status,
  CASE 
    WHEN table_name LIKE '%_v2' AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = REPLACE(table_name, '_v2', '')
    ) THEN '⚠️ Potential conflict with original table'
    ELSE '✅ No obvious conflicts'
  END as conflict_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%_v2' OR table_name LIKE '%_backup' OR table_name LIKE '%_old')
ORDER BY table_name;

-- =============================================================================
-- STEP 11: SUMMARY AND RECOMMENDATIONS
-- =============================================================================

DO $$
DECLARE
  total_issues INTEGER := 0;
  critical_issues INTEGER := 0;
  warning_issues INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 AUDIT SUMMARY AND RECOMMENDATIONS:';
  RAISE NOTICE '=====================================';
  
  -- Count total tables
  SELECT COUNT(*) INTO total_issues 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
  
  -- Count tables without RLS
  SELECT COUNT(*) INTO warning_issues
  FROM pg_tables 
  WHERE schemaname = 'public' AND NOT rowsecurity;
  
  -- Count tables without primary keys
  SELECT COUNT(*) INTO critical_issues
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = t.table_name 
      AND indexname LIKE '%_pkey'
    );
  
  RAISE NOTICE 'Total tables audited: %', total_issues;
  RAISE NOTICE 'Tables without RLS: % (Security concern)', warning_issues;
  RAISE NOTICE 'Tables without primary keys: % (Critical issue)', critical_issues;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 IMMEDIATE ACTIONS REQUIRED:';
  RAISE NOTICE '1. Fix foreign key reference inconsistencies';
  RAISE NOTICE '2. Standardize column naming across similar tables';
  RAISE NOTICE '3. Enable RLS on tables without it';
  RAISE NOTICE '4. Add missing primary keys';
  RAISE NOTICE '5. Consolidate duplicate table versions';
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ WARNING: Multiple table versions detected!';
  RAISE NOTICE 'This can cause data inconsistency and app crashes.';
  RAISE NOTICE 'Consider consolidating to single, consistent schemas.';
END $$;

-- =============================================================================
-- STEP 12: DETAILED TABLE SCHEMA COMPARISON
-- =============================================================================

-- Compare schemas of potentially conflicting tables
SELECT 'DETAILED SCHEMA COMPARISON:' as info;

-- Events table comparison
SELECT 
  'events' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if events_v2 exists and compare
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_v2') THEN
    RAISE NOTICE '';
    RAISE NOTICE 'events_v2 table schema:';
    RAISE NOTICE '=======================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'events_v2 table does not exist';
  END IF;
END $$;

-- Show final recommendations
SELECT 'FINAL RECOMMENDATIONS:' as info;
SELECT 
  'Priority 1: Critical' as priority,
  'Fix foreign key inconsistencies and missing primary keys' as action
UNION ALL
SELECT 
  'Priority 2: High' as priority,
  'Standardize column naming and consolidate table versions' as action
UNION ALL
SELECT 
  'Priority 3: Medium' as priority,
  'Enable RLS and add missing indexes' as action
UNION ALL
SELECT 
  'Priority 4: Low' as priority,
  'Clean up backup/old tables and optimize performance' as action;
