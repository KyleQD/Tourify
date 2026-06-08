-- Fix Music Upload RLS Policies
-- Run this in your Supabase SQL Editor

-- First, let's check if the artist_music table exists and has RLS enabled
DO $$
BEGIN
    -- Enable RLS on artist_music table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_music') THEN
        ALTER TABLE artist_music ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on artist_music table';
    ELSE
        RAISE NOTICE 'artist_music table does not exist';
    END IF;
END $$;

-- Drop ALL existing policies to recreate them properly
DO $$
BEGIN
    -- Drop all existing policies for artist_music table
    DROP POLICY IF EXISTS "Artists can upload their own music" ON artist_music;
    DROP POLICY IF EXISTS "Anyone can view public music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can view their own music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can update their own music" ON artist_music;
    DROP POLICY IF EXISTS "Artists can delete their own music" ON artist_music;
    DROP POLICY IF EXISTS "Users can upload their own music" ON artist_music;
    DROP POLICY IF EXISTS "Users can view public music" ON artist_music;
    DROP POLICY IF EXISTS "Users can manage their own music" ON artist_music;
    DROP POLICY IF EXISTS "Enable read access for all users" ON artist_music;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON artist_music;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON artist_music;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON artist_music;
    
    RAISE NOTICE 'All existing policies dropped';
END $$;

-- Create comprehensive RLS policies for artist_music table
-- Allow users to insert their own music (artist_profile_id can be null)
CREATE POLICY "Artists can upload their own music" ON artist_music
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Anyone can view public music" ON artist_music
    FOR SELECT USING (
        is_public = true
    );

CREATE POLICY "Artists can view their own music" ON artist_music
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Artists can update their own music" ON artist_music
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Artists can delete their own music" ON artist_music
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Also ensure the artist_profiles table has proper RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
        ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view public artist profiles" ON artist_profiles;
        DROP POLICY IF EXISTS "Users can manage their own artist profile" ON artist_profiles;
        DROP POLICY IF EXISTS "Enable read access for all users" ON artist_profiles;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON artist_profiles;
        DROP POLICY IF EXISTS "Enable update for users based on user_id" ON artist_profiles;
        DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON artist_profiles;
        
        -- Create policies
        CREATE POLICY "Users can view public artist profiles" ON artist_profiles
            FOR SELECT USING (true);
            
        CREATE POLICY "Users can manage their own artist profile" ON artist_profiles
            FOR ALL USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS policies updated for artist_profiles table';
    END IF;
END $$;

-- Check if artist_profile_id column allows NULL values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artist_music' 
        AND column_name = 'artist_profile_id' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ artist_profile_id allows NULL values';
    ELSE
        RAISE NOTICE '❌ artist_profile_id does NOT allow NULL values - this might be the issue';
        
        -- Try to alter the column to allow NULL if it doesn't already
        BEGIN
            ALTER TABLE artist_music ALTER COLUMN artist_profile_id DROP NOT NULL;
            RAISE NOTICE '✅ Made artist_profile_id nullable';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not make artist_profile_id nullable: %', SQLERRM;
        END;
    END IF;
END $$;

-- Test the policies
DO $$
BEGIN
    RAISE NOTICE 'Testing RLS policies...';
    
    -- Check if policies exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_music' AND policyname = 'Artists can upload their own music') THEN
        RAISE NOTICE '✅ INSERT policy exists for artist_music';
    ELSE
        RAISE NOTICE '❌ INSERT policy missing for artist_music';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_music' AND policyname = 'Anyone can view public music') THEN
        RAISE NOTICE '✅ SELECT policy exists for artist_music';
    ELSE
        RAISE NOTICE '❌ SELECT policy missing for artist_music';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_music' AND policyname = 'Artists can update their own music') THEN
        RAISE NOTICE '✅ UPDATE policy exists for artist_music';
    ELSE
        RAISE NOTICE '❌ UPDATE policy missing for artist_music';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_music' AND policyname = 'Artists can delete their own music') THEN
        RAISE NOTICE '✅ DELETE policy exists for artist_music';
    ELSE
        RAISE NOTICE '❌ DELETE policy missing for artist_music';
    END IF;
END $$;

-- Verify the artist_music table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'artist_music' 
ORDER BY ordinal_position;

-- Show current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'artist_music';
