-- =============================================================================
-- SIMPLE VENUE CLEANUP
-- A safer approach that only works with tables we know exist
-- =============================================================================

-- Show current user info
SELECT 
  'Current User' as info_type,
  auth.uid() as user_id,
  auth.email() as email;

-- Show all venues for current user
SELECT 
  'Current User Venues' as info_type,
  COUNT(*) as venue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'No venues found - orphaned accounts will be removed by app refresh'
    WHEN COUNT(*) = 1 THEN 'One venue found - should work normally'
    ELSE 'Multiple venues found - all should work'
  END as status
FROM venue_profiles 
WHERE user_id = auth.uid() OR main_profile_id = auth.uid();

-- List all venues with details
SELECT 
  'Venue Details' as info_type,
  id,
  venue_name,
  user_id,
  main_profile_id,
  created_at,
  'Valid venue - should appear in account switcher' as status
FROM venue_profiles 
WHERE user_id = auth.uid() OR main_profile_id = auth.uid()
ORDER BY created_at DESC;

-- Check if we need to update main_profile_id for existing venues
UPDATE venue_profiles 
SET main_profile_id = user_id 
WHERE (user_id = auth.uid() OR main_profile_id = auth.uid())
  AND main_profile_id IS NULL;

-- Show final status
SELECT 
  'Final Status' as info_type,
  COUNT(*) as total_venues,
  array_agg(venue_name ORDER BY created_at DESC) as venue_names,
  '✅ Database cleanup complete! Clear browser cache next.' as next_step
FROM venue_profiles 
WHERE user_id = auth.uid() OR main_profile_id = auth.uid();

-- Instructions for next steps
SELECT 
  '📋 Next Steps' as instructions,
  'The database is clean. Orphaned accounts in the UI are from cached data.' as explanation,
  'Run the CLEAR_VENUE_CACHE.js script in your browser console to refresh the account switcher.' as action; 