-- =============================================================================
-- DETAILED POSTS TABLE CHECK
-- =============================================================================
-- 
-- This script provides a detailed check of the posts table structure
-- to understand what columns actually exist
-- =============================================================================

-- Check if posts table exists
SELECT 
  'TABLE EXISTENCE CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'posts'
  ) THEN '✅ posts table exists' ELSE '❌ posts table does not exist' END as table_status;

-- Show ALL columns in posts table
SELECT 
  'ALL POSTS COLUMNS' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'posts'
ORDER BY ordinal_position;

-- Check specific columns we're looking for
SELECT 
  'SPECIFIC COLUMN CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id'
  ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as user_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'profile_id'
  ) THEN '✅ profile_id exists' ELSE '❌ profile_id missing' END as profile_id_status;

-- Try to run a simple SELECT to see what happens
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 TESTING DIRECT ACCESS TO POSTS TABLE...';
  
  BEGIN
    -- Try to count rows
    EXECUTE 'SELECT COUNT(*) FROM posts' INTO test_count;
    RAISE NOTICE '   ✅ Successfully counted posts table: % rows', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error counting posts table: %', SQLERRM;
  END;
  
  BEGIN
    -- Try to access user_id column specifically
    EXECUTE 'SELECT COUNT(*) FROM posts WHERE user_id IS NOT NULL' INTO test_count;
    RAISE NOTICE '   ✅ Successfully accessed user_id column: % non-null values', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing user_id column: %', SQLERRM;
  END;
  
  BEGIN
    -- Try to access profile_id column specifically
    EXECUTE 'SELECT COUNT(*) FROM posts WHERE profile_id IS NOT NULL' INTO test_count;
    RAISE NOTICE '   ✅ Successfully accessed profile_id column: % non-null values', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ Error accessing profile_id column: %', SQLERRM;
  END;
  
END $$;
