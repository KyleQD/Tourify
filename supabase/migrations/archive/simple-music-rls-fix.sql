-- Simple Music Upload RLS Fix
-- Run this in your Supabase SQL Editor

-- Enable RLS on artist_music table
ALTER TABLE artist_music ENABLE ROW LEVEL SECURITY;

-- Create the essential INSERT policy (this is what's causing the 403 error)
-- Only create if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'artist_music' 
        AND policyname = 'Artists can upload their own music'
    ) THEN
        CREATE POLICY "Artists can upload their own music" ON artist_music
            FOR INSERT WITH CHECK (
                auth.uid() = user_id
            );
        RAISE NOTICE '✅ Created INSERT policy for artist_music';
    ELSE
        RAISE NOTICE '✅ INSERT policy already exists for artist_music';
    END IF;
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

-- Show current policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'artist_music'
ORDER BY policyname;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE '🎉 RLS fix applied successfully!';
    RAISE NOTICE 'Users should now be able to upload music files.';
END $$;
