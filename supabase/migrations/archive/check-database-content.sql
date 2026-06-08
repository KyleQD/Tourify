-- =============================================================================
-- DATABASE CONTENT DIAGNOSTIC (UPDATED FOR ACTUAL SCHEMA)
-- Run this in your Supabase SQL Editor to see what's actually in your tables
-- =============================================================================

-- Check what tables exist
SELECT 'EXISTING TABLES:' as info;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('profiles', 'artist_profiles', 'venue_profiles', 'events', 'posts', 'tours') 
        THEN '✅ Core Table' 
        ELSE '📋 Other Table' 
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check profiles table content (using actual column names)
SELECT 'PROFILES TABLE CONTENT:' as info;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as profiles_with_username,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_full_name,
    COUNT(CASE WHEN avatar_url IS NOT NULL THEN 1 END) as profiles_with_avatar
FROM profiles;

-- Show sample profiles (if any exist)
SELECT 'SAMPLE PROFILES:' as info;
SELECT 
    id,
    username,
    full_name,
    bio,
    avatar_url,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check events table content (using actual column names)
SELECT 'EVENTS TABLE CONTENT:' as info;
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as events_with_name,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as events_with_description,
    COUNT(CASE WHEN tour_id IS NOT NULL THEN 1 END) as events_with_tour
FROM events;

-- Show sample events (if any exist)
SELECT 'SAMPLE EVENTS:' as info;
SELECT 
    id,
    name,
    description,
    tour_id,
    created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- Check posts table content (using actual column names)
SELECT 'POSTS TABLE CONTENT:' as info;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as posts_with_content,
    COUNT(CASE WHEN images IS NOT NULL AND array_length(images, 1) > 0 THEN 1 END) as posts_with_images,
    COUNT(CASE WHEN video_url IS NOT NULL THEN 1 END) as posts_with_video
FROM posts;

-- Show sample posts (if any exist)
SELECT 'SAMPLE POSTS:' as info;
SELECT 
    id,
    LEFT(content, 50) || '...' as content_preview,
    CASE WHEN images IS NOT NULL THEN array_length(images, 1) ELSE 0 END as image_count,
    video_url,
    created_at
FROM posts 
ORDER BY created_at DESC 
LIMIT 5;

-- Check artist profiles
SELECT 'ARTIST PROFILES CONTENT:' as info;
SELECT 
    COUNT(*) as total_artist_profiles,
    COUNT(CASE WHEN artist_name IS NOT NULL THEN 1 END) as artists_with_name,
    COUNT(CASE WHEN bio IS NOT NULL THEN 1 END) as artists_with_bio
FROM artist_profiles;

-- Check venue profiles
SELECT 'VENUE PROFILES CONTENT:' as info;
SELECT 
    COUNT(*) as total_venue_profiles,
    COUNT(CASE WHEN venue_name IS NOT NULL THEN 1 END) as venues_with_name,
    COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as venues_with_address
FROM venue_profiles;

-- Check storage buckets vs database content
SELECT 'STORAGE VS DATABASE COMPARISON:' as info;
SELECT 
    'profiles' as table_name,
    (SELECT COUNT(*) FROM profiles) as database_records,
    'avatars' as storage_bucket,
    'Check manually in Storage tab' as storage_files
UNION ALL
SELECT 
    'posts' as table_name,
    (SELECT COUNT(*) FROM posts) as database_records,
    'post-media' as storage_bucket,
    'Check manually in Storage tab' as storage_files
UNION ALL
SELECT 
    'events' as table_name,
    (SELECT COUNT(*) FROM events) as database_records,
    'event-media' as storage_bucket,
    'Check manually in Storage tab' as storage_files;

-- Summary
SELECT 'SUMMARY:' as info;
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN '❌ No profiles in database'
        ELSE '✅ Profiles exist in database'
    END as profiles_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM events) = 0 THEN '❌ No events in database'
        ELSE '✅ Events exist in database'
    END as events_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM posts) = 0 THEN '❌ No posts in database'
        ELSE '✅ Posts exist in database'
    END as posts_status;

-- Check what columns actually exist in each table
SELECT 'ACTUAL TABLE STRUCTURES:' as info;
SELECT 
    'profiles' as table_name,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
GROUP BY table_name

UNION ALL

SELECT 
    'events' as table_name,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'events'
GROUP BY table_name

UNION ALL

SELECT 
    'posts' as table_name,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
GROUP BY table_name;

-- Check for specific missing columns that your app needs
SELECT 'MISSING COLUMNS CHECK:' as info;
SELECT 
    'posts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'type') THEN '✅ type' ELSE '❌ type' END as type_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'visibility') THEN '✅ visibility' ELSE '❌ visibility' END as visibility_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'location') THEN '✅ location' ELSE '❌ location' END as location_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hashtags') THEN '✅ hashtags' ELSE '❌ hashtags' END as hashtags_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_urls') THEN '✅ media_urls' ELSE '❌ media_urls (using images)' END as media_column

UNION ALL

SELECT 
    'events' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_id') THEN '✅ user_id' ELSE '❌ user_id' END as user_id_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_public') THEN '✅ is_public' ELSE '❌ is_public' END as is_public_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN '✅ status' ELSE '❌ status' END as status_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_price') THEN '✅ ticket_price' ELSE '❌ ticket_price' END as ticket_price_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'capacity') THEN '✅ capacity' ELSE '❌ capacity' END as capacity_column

UNION ALL

SELECT 
    'profiles' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN '✅ bio' ELSE '❌ bio' END as bio_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN '✅ website' ELSE '❌ website' END as website_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN '✅ location' ELSE '❌ location' END as location_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN '✅ role' ELSE '❌ role' END as role_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN '✅ is_verified' ELSE '❌ is_verified' END as verified_column;
