-- =============================================================================
-- CHECK POSTS TABLE COLUMNS
-- =============================================================================
-- 
-- This script checks what columns actually exist in the posts table
-- to fix the orphaned records check in Phase 4
-- =============================================================================

-- Check posts table structure
SELECT 
  'POSTS TABLE COLUMNS' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'posts'
ORDER BY ordinal_position;

-- Check if common foreign key columns exist
SELECT 
  'FOREIGN KEY COLUMNS CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id'
  ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as user_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'profile_id'
  ) THEN '✅ profile_id exists' ELSE '❌ profile_id missing' END as profile_id_status;
