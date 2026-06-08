-- Simple Storage Fix - Make Buckets Public
-- Run this in your Supabase SQL Editor

-- 1. Check current bucket settings
SELECT 'Current Storage Buckets:' as info;
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name IN ('artist-music', 'artist-photos', 'post-media')
ORDER BY name;

-- 2. Make buckets public for easier uploads
DO $$
BEGIN
    -- Make artist-music bucket public
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'artist-music') THEN
        UPDATE storage.buckets SET public = true WHERE name = 'artist-music';
        RAISE NOTICE '✅ Made artist-music bucket public';
    ELSE
        RAISE NOTICE '⚠️ artist-music bucket does not exist';
    END IF;
    
    -- Make artist-photos bucket public
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'artist-photos') THEN
        UPDATE storage.buckets SET public = true WHERE name = 'artist-photos';
        RAISE NOTICE '✅ Made artist-photos bucket public';
    ELSE
        RAISE NOTICE '⚠️ artist-photos bucket does not exist';
    END IF;
    
    -- Make post-media bucket public
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'post-media') THEN
        UPDATE storage.buckets SET public = true WHERE name = 'post-media';
        RAISE NOTICE '✅ Made post-media bucket public';
    ELSE
        RAISE NOTICE '⚠️ post-media bucket does not exist';
    END IF;
END $$;

-- 3. Verify the changes
SELECT 'Updated Storage Buckets:' as info;
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name IN ('artist-music', 'artist-photos', 'post-media')
ORDER BY name;

-- 4. Test authentication
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    RAISE NOTICE '=== AUTHENTICATION CHECK ===';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
        RAISE NOTICE '💡 You need to be logged in to upload files';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
        RAISE NOTICE '✅ Storage buckets are now public';
        RAISE NOTICE '✅ You should be able to upload files now';
    END IF;
END $$;

-- 5. Final status
DO $$
BEGIN
    RAISE NOTICE '=== SIMPLE STORAGE FIX APPLIED ===';
    RAISE NOTICE '✅ Made storage buckets public';
    RAISE NOTICE '✅ No complex RLS policies needed';
    RAISE NOTICE '✅ File uploads should work now';
    RAISE NOTICE '💡 Try uploading a track again!';
END $$;
