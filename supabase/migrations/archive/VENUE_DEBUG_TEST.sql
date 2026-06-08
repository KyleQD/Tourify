-- =============================================================================
-- VENUE DEBUG TEST SCRIPT
-- Run this to test venue access and debug any issues
-- =============================================================================

-- First, let's see what venues exist and their structure
SELECT 
  'Current Venue Profiles' as test_name,
  id,
  user_id,
  main_profile_id,
  venue_name,
  created_at,
  updated_at
FROM venue_profiles
ORDER BY created_at DESC;

-- Check if we have any venues for the current user
SELECT 
  'Venues for Current User' as test_name,
  COUNT(*) as venue_count,
  array_agg(venue_name) as venue_names
FROM venue_profiles 
WHERE user_id = auth.uid() OR main_profile_id = auth.uid();

-- Test the RLS policies
SELECT 
  'RLS Policy Test' as test_name,
  COUNT(*) as accessible_venues
FROM venue_profiles;

-- Check the table structure
SELECT 
  'Table Structure' as test_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'venue_profiles' 
ORDER BY ordinal_position;

-- Check current user info
SELECT 
  'Current User Info' as test_name,
  auth.uid() as user_id,
  auth.email() as email;

-- Test the get_venue_dashboard_stats function
SELECT 
  'Dashboard Stats Function Test' as test_name,
  get_venue_dashboard_stats(id) as stats
FROM venue_profiles 
WHERE user_id = auth.uid() OR main_profile_id = auth.uid()
LIMIT 1;

-- Check if there are duplicate venues
SELECT 
  'Duplicate Venue Check' as test_name,
  venue_name,
  COUNT(*) as count
FROM venue_profiles 
GROUP BY venue_name, user_id 
HAVING COUNT(*) > 1;

-- Final recommendations
SELECT 
  'Debug Results' as test_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM venue_profiles WHERE user_id = auth.uid() OR main_profile_id = auth.uid()) = 0 
    THEN 'No venues found - create a venue first'
    WHEN (SELECT COUNT(*) FROM venue_profiles WHERE user_id = auth.uid() OR main_profile_id = auth.uid()) = 1 
    THEN 'One venue found - should work normally'
    ELSE 'Multiple venues found - venue selection should work'
  END as recommendation; 