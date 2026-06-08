-- Fix RLS Policy Conflicts for Music Upload
-- Run this in your Supabase SQL Editor

-- First, let's see what we're working with
SELECT 'Current policies before fix:' as info;
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'artist_music' ORDER BY cmd, policyname;

-- Drop ALL existing policies to start fresh
DO $$
BEGIN
    RAISE NOTICE '🗑️ Dropping all existing policies...';
    
    -- Drop all policies for artist_music
    DROP POLICY IF EXISTS "Users can insert their own music" ON artist_music;
    DROP POLICY IF EXISTS "Users can update their own music" ON artist_music;
    DROP POLICY IF EXISTS "Users can view their own music" ON artist_music;
    DROP POLICY IF EXISTS "Users can delete their own music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can upload their own music" ON artist_music;
    DROP POLICY IF EXISTS "Anyone can view public music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can view their own music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can update their own music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can delete their own music" ON artist_music;
    DROP POLICY IF EXISTS "Enable read access for all users" ON artist_music;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON artist_music;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON artist_music;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON artist_music;
    
    RAISE NOTICE '✅ All policies dropped';
END $$;

-- Create clean, simple policies
DO $$
BEGIN
    RAISE NOTICE '🔧 Creating new policies...';
    
    -- INSERT policy - allow users to insert their own music
    CREATE POLICY "music_insert_policy" ON artist_music
        FOR INSERT WITH CHECK (
            auth.uid() = user_id
        );
    
    -- SELECT policy - allow users to view their own music and public music
    CREATE POLICY "music_select_policy" ON artist_music
        FOR SELECT USING (
            auth.uid() = user_id OR is_public = true
        );
    
    -- UPDATE policy - allow users to update their own music
    CREATE POLICY "music_update_policy" ON artist_music
        FOR UPDATE USING (
            auth.uid() = user_id
        );
    
    -- DELETE policy - allow users to delete their own music
    CREATE POLICY "music_delete_policy" ON artist_music
        FOR DELETE USING (
            auth.uid() = user_id
        );
    
    RAISE NOTICE '✅ New policies created';
END $$;

-- Ensure artist_profile_id can be NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artist_music' 
        AND column_name = 'artist_profile_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE artist_music ALTER COLUMN artist_profile_id DROP NOT NULL;
        RAISE NOTICE '✅ Made artist_profile_id nullable';
    ELSE
        RAISE NOTICE '✅ artist_profile_id already allows NULL values';
    END IF;
END $$;

-- Test the new policies
DO $$
DECLARE
    current_user_id uuid;
    test_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No authenticated user - policies created but cannot test insert';
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
            'Test Track - RLS Fix',
            'Testing the new RLS policies',
            'single',
            'test',
            'https://example.com/test.mp3',
            ARRAY['test', 'rls-fix'],
            false,
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '🎉 SUCCESS! Insert worked! Test record ID: %', test_id;
        
        -- Clean up test data
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert still failed: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;

-- Show the new policies
SELECT 'New policies after fix:' as info;
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'artist_music' ORDER BY cmd, policyname;

-- Final status
DO $$
BEGIN
    RAISE NOTICE '🎉 RLS fix completed!';
    RAISE NOTICE 'Users should now be able to upload music files successfully.';
END $$;
