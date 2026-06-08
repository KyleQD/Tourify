-- Comprehensive Music Upload System Test
-- Run this in your Supabase SQL Editor

-- 1. Check if all required tables exist
SELECT 'Checking required tables:' as info;
SELECT 
    table_name,
    CASE WHEN table_name IN ('artist_music', 'artist_profiles', 'music_comments', 'music_shares', 'music_plays') 
         THEN '✅ Required' 
         ELSE '⚠️ Optional' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('artist_music', 'artist_profiles', 'music_comments', 'music_shares', 'music_plays', 'posts', 'messages')
ORDER BY table_name;

-- 2. Check artist_music table structure in detail
SELECT 'artist_music table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'id' THEN 'Primary Key'
        WHEN column_name = 'user_id' THEN 'Foreign Key to auth.users'
        WHEN column_name = 'artist_profile_id' THEN 'Foreign Key to artist_profiles'
        ELSE 'Regular Column'
    END as column_type
FROM information_schema.columns 
WHERE table_name = 'artist_music' 
ORDER BY ordinal_position;

-- 3. Check for any constraints that might be causing issues
SELECT 'Table constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'artist_music'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Check RLS status and policies
SELECT 'RLS Status and Policies:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'artist_music';

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'artist_music'
ORDER BY cmd, policyname;

-- 5. Test authentication context
DO $$
DECLARE
    current_user_id uuid;
    current_user_email text;
BEGIN
    current_user_id := auth.uid();
    current_user_email := auth.jwt() ->> 'email';
    
    RAISE NOTICE '=== Authentication Test ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found (auth.uid() is NULL)';
        RAISE NOTICE '❌ This is likely the cause of the 403 error!';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
        RAISE NOTICE '✅ User email: %', current_user_email;
    END IF;
    
    -- Check if user exists in auth.users
    IF current_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = current_user_id) THEN
            RAISE NOTICE '✅ User exists in auth.users table';
        ELSE
            RAISE NOTICE '❌ User NOT found in auth.users table - this is a problem!';
        END IF;
    END IF;
END $$;

-- 6. Test a complete insert with detailed error reporting
DO $$
DECLARE
    current_user_id uuid;
    test_id uuid;
    test_data jsonb;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test insert - no authenticated user';
        RETURN;
    END IF;
    
    RAISE NOTICE '=== Testing Complete Insert ===';
    RAISE NOTICE 'User ID: %', current_user_id;
    
    -- Prepare test data
    test_data := jsonb_build_object(
        'user_id', current_user_id,
        'title', 'Test Track - Comprehensive Test',
        'description', 'Testing the complete upload system',
        'type', 'single',
        'genre', 'test',
        'file_url', 'https://example.com/test.mp3',
        'cover_art_url', 'https://example.com/cover.jpg',
        'tags', jsonb_build_array('test', 'comprehensive'),
        'is_featured', false,
        'is_public', true,
        'play_count', 0,
        'likes_count', 0,
        'comments_count', 0,
        'shares_count', 0
    );
    
    RAISE NOTICE 'Test data: %', test_data;
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            title,
            description,
            type,
            genre,
            file_url,
            cover_art_url,
            tags,
            is_featured,
            is_public,
            play_count,
            likes_count,
            comments_count,
            shares_count
        ) VALUES (
            current_user_id,
            'Test Track - Comprehensive Test',
            'Testing the complete upload system',
            'single',
            'test',
            'https://example.com/test.mp3',
            'https://example.com/cover.jpg',
            ARRAY['test', 'comprehensive'],
            false,
            true,
            0,
            0,
            0,
            0
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Insert worked! Test record ID: %', test_id;
        
        -- Clean up test data
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed with error: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
        RAISE NOTICE '❌ Error detail: %', SQLERRM;
        
        -- Try to get more specific error information
        IF SQLSTATE = '42501' THEN
            RAISE NOTICE '❌ This is a permission error - check RLS policies';
        ELSIF SQLSTATE = '23502' THEN
            RAISE NOTICE '❌ This is a NOT NULL constraint violation';
        ELSIF SQLSTATE = '23503' THEN
            RAISE NOTICE '❌ This is a foreign key constraint violation';
        ELSIF SQLSTATE = '23514' THEN
            RAISE NOTICE '❌ This is a check constraint violation';
        END IF;
    END;
END $$;

-- 7. Check storage bucket configuration
SELECT 'Storage Buckets:' as info;
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name IN ('artist-music', 'artist-photos', 'post-media')
ORDER BY name;

-- 8. Check storage policies (only if the table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'policies') THEN
        RAISE NOTICE 'Storage policies table exists - checking policies...';
        
        -- This will only run if the table exists
        PERFORM 1 FROM storage.policies 
        WHERE bucket_id IN (
            SELECT id FROM storage.buckets 
            WHERE name IN ('artist-music', 'artist-photos')
        );
        
        RAISE NOTICE 'Storage policies checked successfully';
    ELSE
        RAISE NOTICE '⚠️ Storage policies table does not exist - this is normal for some Supabase setups';
        RAISE NOTICE '💡 Storage bucket permissions are likely handled through bucket-level settings';
    END IF;
END $$;

-- 9. Final status report
DO $$
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE TEST COMPLETED ===';
    RAISE NOTICE 'Check the results above for any issues.';
    RAISE NOTICE 'If you see "SUCCESS! Insert worked!" then the database is fine.';
    RAISE NOTICE 'If you see authentication errors, that explains the 403 issue.';
END $$;
