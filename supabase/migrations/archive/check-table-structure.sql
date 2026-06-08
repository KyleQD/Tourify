-- Check Table Structure First
-- Run this in your Supabase SQL Editor

-- 1. Check artist_profiles table structure
SELECT 'artist_profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'artist_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check artist_music table structure
SELECT 'artist_music table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'artist_music' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check authentication
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    RAISE NOTICE '=== AUTHENTICATION CHECK ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
    END IF;
END $$;

-- 4. Test insert with minimal required fields
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
    
    RAISE NOTICE '🧪 Testing minimal insert...';
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            title,
            type,
            file_url,
            is_public
        ) VALUES (
            current_user_id,
            'Structure Test',
            'single',
            'https://example.com/test.mp3',
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Minimal insert worked!';
        RAISE NOTICE 'Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;
