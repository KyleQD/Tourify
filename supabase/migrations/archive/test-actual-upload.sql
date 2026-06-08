-- Test Actual Upload Code
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
        RETURN;
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
    END IF;
END $$;

-- 2. Test the exact insert that the upload code is trying to do
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
    
    RAISE NOTICE '🧪 Testing exact upload code insert...';
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            artist_profile_id,
            title,
            description,
            type,
            genre,
            release_date,
            duration,
            file_url,
            cover_art_url,
            lyrics,
            spotify_url,
            apple_music_url,
            soundcloud_url,
            youtube_url,
            tags,
            is_featured,
            is_public
            -- Note: NOT including updated_at - let database handle it
        ) VALUES (
            current_user_id,
            NULL, -- artist_profile_id can be null
            'Test Track Title',
            'Test track description',
            'single',
            'test-genre',
            '2024-01-01',
            180, -- 3 minutes
            'https://example.com/test.mp3',
            'https://example.com/cover.jpg',
            'Test lyrics here',
            'https://spotify.com/test',
            'https://music.apple.com/test',
            'https://soundcloud.com/test',
            'https://youtube.com/test',
            ARRAY['test', 'demo'],
            false,
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Exact upload insert worked!';
        RAISE NOTICE 'Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
        RAISE NOTICE '❌ This is the exact error the upload code is getting';
    END;
END $$;

-- 3. Test with minimal fields (like our simple test)
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
    
    RAISE NOTICE '🧪 Testing minimal insert (like simple test)...';
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            title,
            type,
            file_url,
            is_public
        ) VALUES (
            current_user_id,
            'Minimal Test Track',
            'single',
            'https://example.com/minimal.mp3',
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Minimal insert worked!';
        RAISE NOTICE 'Test record ID: %', test_id;
        
        -- Clean up
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Minimal insert failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;

-- 4. Final analysis
DO $$
BEGIN
    RAISE NOTICE '=== ANALYSIS ===';
    RAISE NOTICE 'If the exact upload insert failed but minimal worked:';
    RAISE NOTICE '  - The issue is with one of the optional fields';
    RAISE NOTICE '  - Likely data type issues or constraints';
    RAISE NOTICE 'If both failed:';
    RAISE NOTICE '  - There is a deeper issue with the database';
END $$;
