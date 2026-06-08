-- Ultra Simple Test
-- Run this in your Supabase SQL Editor

-- 1. Check authentication
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    RAISE NOTICE '=== AUTHENTICATION CHECK ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
        RAISE NOTICE '💡 This explains the 403 error - you need to be logged in';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
    END IF;
END $$;

-- 2. Test minimal insert (only if authenticated)
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
            'Ultra Simple Test',
            'single',
            'https://example.com/test.mp3',
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Insert worked!';
        RAISE NOTICE 'Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;

-- 3. Final result
DO $$
BEGIN
    RAISE NOTICE '=== TEST COMPLETED ===';
    RAISE NOTICE 'If you see "SUCCESS! Insert worked!" then the database is fine.';
    RAISE NOTICE 'If you see authentication errors, that explains the 403 issue.';
END $$;
