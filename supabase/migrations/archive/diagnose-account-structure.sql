-- Diagnose Account Structure and Authentication
-- Run this in your Supabase SQL Editor

-- 1. Check current authentication
DO $$
DECLARE
    current_user_id uuid;
    current_user_email text;
BEGIN
    current_user_id := auth.uid();
    current_user_email := auth.jwt() ->> 'email';
    
    RAISE NOTICE '=== AUTHENTICATION CHECK ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
        RETURN;
    ELSE
        RAISE NOTICE '✅ Authenticated user found:';
        RAISE NOTICE '   - User ID: %', current_user_id;
        RAISE NOTICE '   - Email: %', current_user_email;
    END IF;
END $$;

-- 2. Check if user exists in auth.users
SELECT 'User in auth.users:' as info;
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM auth.users 
WHERE id = auth.uid();

-- 3. Check if user has a profile in profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE NOTICE 'Profiles table exists - checking user profile...';
        
        -- This will only run if the table exists
        PERFORM 1 FROM profiles WHERE id = auth.uid();
        
        RAISE NOTICE 'Profile check completed';
    ELSE
        RAISE NOTICE '⚠️ Profiles table does not exist - this is normal';
    END IF;
END $$;

-- 4. Check artist profiles for this user
SELECT 'Artist profiles for this user:' as info;
SELECT 
    id,
    user_id,
    artist_name,
    bio,
    genres,
    created_at
FROM artist_profiles 
WHERE user_id = auth.uid();

-- 5. Check if there are any artist profiles at all
SELECT 'All artist profiles (first 5):' as info;
SELECT 
    id,
    user_id,
    artist_name,
    created_at
FROM artist_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check the relationship between users and artist profiles
SELECT 'User-Artist Profile Relationship:' as info;
SELECT 
    u.id as user_id,
    u.email as user_email,
    ap.id as artist_profile_id,
    ap.artist_name,
    ap.user_id as artist_user_id
FROM auth.users u
LEFT JOIN artist_profiles ap ON u.id = ap.user_id
WHERE u.id = auth.uid();

-- 7. Check if there are any music tracks
SELECT 'Music tracks for this user:' as info;
SELECT 
    id,
    user_id,
    title,
    type,
    created_at
FROM artist_music 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 8. Check all music tracks (first 5)
SELECT 'All music tracks (first 5):' as info;
SELECT 
    id,
    user_id,
    title,
    type,
    created_at
FROM artist_music 
ORDER BY created_at DESC 
LIMIT 5;

-- 9. Test the exact insert that's failing
DO $$
DECLARE
    current_user_id uuid;
    test_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test - no authenticated user';
        RETURN;
    END IF;
    
    RAISE NOTICE '=== TESTING EXACT UPLOAD INSERT ===';
    RAISE NOTICE 'Using user_id: %', current_user_id;
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            title,
            description,
            type,
            genre,
            file_url,
            tags,
            is_featured,
            is_public
        ) VALUES (
            current_user_id,
            'Account Structure Test',
            'Testing account structure and authentication',
            'single',
            'test',
            'https://example.com/test.mp3',
            ARRAY['test', 'account-structure'],
            false,
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Insert worked with user_id: %', current_user_id;
        RAISE NOTICE 'Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
        RAISE NOTICE '❌ User ID used: %', current_user_id;
    END;
END $$;

-- 10. Check if there are any account management tables
SELECT 'Account management tables:' as info;
SELECT 
    table_name,
    CASE WHEN table_name IN ('user_accounts', 'account_sessions', 'account_permissions') 
         THEN '✅ Account management table' 
         ELSE '⚠️ Other table' 
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_accounts', 'account_sessions', 'account_permissions', 'profiles')
ORDER BY table_name;

-- 11. Final analysis
DO $$
BEGIN
    RAISE NOTICE '=== ACCOUNT STRUCTURE ANALYSIS ===';
    RAISE NOTICE 'This will help identify if the issue is:';
    RAISE NOTICE '1. Authentication context (auth.uid() vs user.id)';
    RAISE NOTICE '2. Account structure (primary user vs artist profile)';
    RAISE NOTICE '3. User ID mismatch in the upload process';
END $$;
