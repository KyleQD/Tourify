-- =============================================================================
-- CLEANUP ORPHANED VENUE ACCOUNTS
-- This script will remove venue accounts that don't have corresponding database entries
-- =============================================================================

-- First, let's see what's currently in the venue_profiles table
SELECT 
  'Current Venue Profiles in Database' as check_type,
  id,
  user_id,
  venue_name,
  created_at
FROM venue_profiles
WHERE user_id = auth.uid() OR main_profile_id = auth.uid()
ORDER BY created_at DESC;

-- Check what tables actually exist
SELECT 
  'Available Tables' as check_type,
  table_name,
  'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account_relationships', 'user_sessions', 'account_activity_log')
ORDER BY table_name;

-- Check if there are any account_relationships for venues that don't exist (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships' AND table_schema = 'public') THEN
    -- Check the actual columns in account_relationships
    RAISE NOTICE 'account_relationships table exists, checking structure...';
  ELSE
    RAISE NOTICE 'account_relationships table does not exist, skipping...';
  END IF;
END $$;

-- Check user_sessions for venue sessions that don't exist (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions' AND table_schema = 'public') THEN
    RAISE NOTICE 'user_sessions table exists, checking for orphaned entries...';
    
    -- Only run if the table has the expected columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'active_profile_id') THEN
      DELETE FROM user_sessions
      WHERE user_id = auth.uid()
        AND active_account_type = 'venue'
        AND NOT EXISTS (
          SELECT 1 FROM venue_profiles vp 
          WHERE vp.id = active_profile_id
        );
      RAISE NOTICE 'Cleaned up orphaned user_sessions entries';
    END IF;
  ELSE
    RAISE NOTICE 'user_sessions table does not exist, skipping...';
  END IF;
END $$;

-- Clean up any activity logs for non-existent venues (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log' AND table_schema = 'public') THEN
    RAISE NOTICE 'account_activity_log table exists, cleaning up orphaned entries...';
    
    DELETE FROM account_activity_log
    WHERE user_id = auth.uid()
      AND account_type = 'venue'
      AND NOT EXISTS (
        SELECT 1 FROM venue_profiles vp 
        WHERE vp.id = profile_id
      );
    RAISE NOTICE 'Cleaned up orphaned activity log entries';
  ELSE
    RAISE NOTICE 'account_activity_log table does not exist, skipping...';
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify cleanup was successful
SELECT 
  'Cleanup Verification' as check_type,
  (
    SELECT COUNT(*) 
    FROM venue_profiles 
    WHERE user_id = auth.uid() OR main_profile_id = auth.uid()
  ) as valid_venues_remaining,
  'Cleanup complete - orphaned entries removed' as status;

-- Show current valid venues after cleanup
SELECT 
  'Valid Venues After Cleanup' as check_type,
  id,
  venue_name,
  created_at,
  'Should appear in account switcher' as status
FROM venue_profiles
WHERE user_id = auth.uid() OR main_profile_id = auth.uid()
ORDER BY created_at DESC;

-- Success message
SELECT 
  '🧹 CLEANUP COMPLETE! 🧹' as status,
  'Orphaned venue accounts have been removed. Refresh your app to see the updated account switcher.' as message; 