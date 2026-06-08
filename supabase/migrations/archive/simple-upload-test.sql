-- Simple Music Upload Test
-- Run this in your Supabase SQL Editor

-- 1. Check authentication
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    RAISE NOTICE '=== Authentication Check ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
        RAISE NOTICE '💡 This explains the 403 error - you need to be logged in';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
    END IF;
END $$;

-- 2. Check if artist_music table exists
SELECT 'artist_music table exists:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'artist_music' AND table_schema = 'public'
) as table_exists;

-- 3. Check RLS policies
SELECT 'RLS Policies:' as info;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'artist_music'
ORDER BY cmd, policyname;

-- 4. Test insert (only if authenticated)
DO $$
DECLARE
    current_user_id uuid;
    test_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test insert - no authenticated user';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing insert with user_id: %', current_user_id;
    
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
            'Simple Test Track',
            'Testing upload functionality',
            'single',
            'test',
            'https://example.com/test.mp3',
            ARRAY['test'],
            false,
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Insert worked! Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;

-- 5. Check storage buckets
SELECT 'Storage Buckets:' as info;
SELECT 
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE name IN ('artist-music', 'artist-photos')
ORDER BY name;

-- 6. Final result
DO $$
BEGIN
    RAISE NOTICE '=== TEST COMPLETED ===';
    RAISE NOTICE 'If you see "SUCCESS! Insert worked!" then the database is fine.';
    RAISE NOTICE 'If you see authentication errors, that explains the 403 issue.';
END $$;
