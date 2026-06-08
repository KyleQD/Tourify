-- =============================================================================
-- CHECK EVENTS TABLE COLUMNS
-- =============================================================================
-- 
-- This script checks what columns actually exist in the events table
-- to fix the orphaned records check in Phase 4
-- =============================================================================

-- Check events table structure
SELECT 
  'EVENTS TABLE COLUMNS' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Check if common foreign key columns exist
SELECT 
  'FOREIGN KEY COLUMNS CHECK' as info_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'user_id'
  ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as user_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue_id'
  ) THEN '✅ venue_id exists' ELSE '❌ venue_id missing' END as venue_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tour_id'
  ) THEN '✅ tour_id exists' ELSE '❌ tour_id missing' END as tour_id_status;
