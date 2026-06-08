-- =============================================================================
-- PHASE 1: CRITICAL ISSUES - IMMEDIATE EXECUTION
-- =============================================================================
-- 
-- This script addresses the most critical database issues that could cause
-- data corruption or loss. Execute this FIRST before any other phases.
--
-- EXECUTION ORDER:
-- 1. Check for missing primary keys
-- 2. Check for missing foreign key constraints
-- 3. Fix identified issues
-- 4. Verify data integrity
-- =============================================================================

-- =============================================================================
-- STEP 1.1: IDENTIFY TABLES MISSING PRIMARY KEYS
-- =============================================================================

-- Check which tables are missing primary keys
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasprimarykey,
  CASE 
    WHEN hasprimarykey = false THEN '🚨 CRITICAL: Missing Primary Key'
    ELSE '✅ Primary Key Present'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND hasprimarykey = false
ORDER BY tablename;

-- =============================================================================
-- STEP 1.2: IDENTIFY POTENTIAL FOREIGN KEY ISSUES
-- =============================================================================

-- Check for columns that should have foreign key constraints
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  CASE 
    WHEN c.column_name LIKE '%_id' AND c.column_name != 'id' THEN '⚠️ Potential FK missing'
    WHEN c.column_name IN ('user_id', 'created_by', 'owner_user_id') THEN '⚠️ User reference - check FK'
    WHEN c.column_name IN ('profile_id', 'account_id', 'event_id', 'post_id') THEN '⚠️ Entity reference - check FK'
    ELSE '✅ OK'
  END as fk_status,
  CASE 
    WHEN c.column_name LIKE '%_id' AND c.column_name != 'id' THEN 'Consider adding FK constraint'
    WHEN c.column_name IN ('user_id', 'created_by', 'owner_user_id') THEN 'Verify references auth.users(id)'
    WHEN c.column_name IN ('profile_id', 'account_id', 'event_id', 'post_id') THEN 'Verify references exist'
    ELSE 'No action needed'
  END as recommendation
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND c.column_name IN (
    'user_id', 'created_by', 'owner_user_id', 'profile_id', 
    'account_id', 'event_id', 'post_id', 'venue_id', 'tour_id',
    'artist_id', 'organizer_id', 'follower_id', 'following_id'
  )
ORDER BY t.table_name, c.column_name;

-- =============================================================================
-- STEP 1.3: CHECK FOR ORPHANED RECORDS
-- =============================================================================

-- Check for posts without valid users
SELECT 
  'posts' as table_name,
  COUNT(*) as orphaned_count,
  'Posts without valid user_id references' as issue_description
FROM posts p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for events without valid users
SELECT 
  'events' as table_name,
  COUNT(*) as orphaned_count,
  'Events without valid user_id references' as issue_description
FROM events e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Check for follows without valid users
SELECT 
  'follows' as table_name,
  COUNT(*) as orphaned_count,
  'Follows without valid follower_id or following_id' as issue_description
FROM follows f
LEFT JOIN auth.users u1 ON f.follower_id = u1.id
LEFT JOIN auth.users u2 ON f.following_id = u2.id
WHERE u1.id IS NULL OR u2.id IS NULL;

-- =============================================================================
-- STEP 1.4: CHECK EXISTING FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- List all existing foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- STEP 1.5: SUMMARY OF CRITICAL ISSUES
-- =============================================================================

-- Generate summary report
SELECT 
  'CRITICAL ISSUES SUMMARY' as report_type,
  COUNT(CASE WHEN hasprimarykey = false THEN 1 END) as tables_missing_pk,
  COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_missing_rls,
  'Execute Phase 1 fixes immediately' as next_action
FROM pg_tables 
WHERE schemaname = 'public';

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. REVIEW THE RESULTS ABOVE CAREFULLY
-- 2. IDENTIFY WHICH TABLES ARE MISSING PRIMARY KEYS
-- 3. NOTE WHICH COLUMNS NEED FOREIGN KEY CONSTRAINTS
-- 4. COUNT ORPHANED RECORDS BEFORE PROCEEDING
-- 5. DOCUMENT ALL FINDINGS IN THE EXECUTION LOG
--
-- NEXT STEPS AFTER THIS SCRIPT:
-- - Fix missing primary keys on critical tables
-- - Add foreign key constraints where appropriate
-- - Clean up orphaned records
-- - Verify data integrity
--
-- =============================================================================
