-- Test script to verify corrected column names
-- Run this FIRST to test before applying the full solution

-- Test 1: Check what columns actually exist in artist_profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'artist_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Check what columns actually exist in venue_profiles  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'venue_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check what columns actually exist in profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 4: Check what columns actually exist in posts
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 5: Check if Clive Malone's artist profile exists
SELECT 
  id,
  user_id,
  artist_name,
  bio,
  profile_image_url,
  is_verified,
  created_at
FROM artist_profiles 
WHERE user_id = 'bce15693-d2bf-42db-a2f2-68239568fafe';

-- Test 6: Check primary profile for Clive Malone
SELECT 
  id,
  username,
  full_name,
  name,
  avatar_url,
  is_verified,
  created_at
FROM profiles 
WHERE id = 'bce15693-d2bf-42db-a2f2-68239568fafe'; 