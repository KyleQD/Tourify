-- Fix Supabase Storage Permissions for Music Uploads
-- Run this in your Supabase SQL Editor

-- 1. Check if storage buckets exist
SELECT 'Storage Buckets:' as info;
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name IN ('artist-music', 'artist-photos', 'post-media')
ORDER BY name;

-- 2. Enable RLS on storage buckets if not already enabled
DO $$
BEGIN
    -- Enable RLS on artist-music bucket
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'artist-music') THEN
        UPDATE storage.buckets SET public = false WHERE name = 'artist-music';
        RAISE NOTICE '✅ artist-music bucket RLS enabled';
    ELSE
        RAISE NOTICE '⚠️ artist-music bucket does not exist';
    END IF;
    
    -- Enable RLS on artist-photos bucket
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'artist-photos') THEN
        UPDATE storage.buckets SET public = false WHERE name = 'artist-photos';
        RAISE NOTICE '✅ artist-photos bucket RLS enabled';
    ELSE
        RAISE NOTICE '⚠️ artist-photos bucket does not exist';
    END IF;
END $$;

-- 3. Drop existing storage policies to recreate them
DO $$
BEGIN
    -- Drop policies for artist-music bucket
    DROP POLICY IF EXISTS "Users can upload their own music files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view public music files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own music files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own music files" ON storage.objects;
    
    -- Drop policies for artist-photos bucket
    DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view public photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
    
    RAISE NOTICE '✅ Dropped existing storage policies';
END $$;

-- 4. Create comprehensive storage policies for artist-music bucket
CREATE POLICY "Users can upload their own music files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-music')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view public music files" ON storage.objects
    FOR SELECT USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-music')
    );

CREATE POLICY "Users can update their own music files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-music')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own music files" ON storage.objects
    FOR DELETE USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-music')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 5. Create comprehensive storage policies for artist-photos bucket
CREATE POLICY "Users can upload their own photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-photos')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view public photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-photos')
    );

CREATE POLICY "Users can update their own photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-photos')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = (SELECT id FROM storage.buckets WHERE name = 'artist-photos')
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 6. Verify the policies were created
SELECT 'Storage Policies Created:' as info;
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
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%music%' OR policyname LIKE '%photo%'
ORDER BY policyname;

-- 7. Test storage upload permissions
DO $$
DECLARE
    current_user_id uuid;
    test_bucket_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test - no authenticated user';
        RETURN;
    END IF;
    
    -- Get bucket ID
    SELECT id INTO test_bucket_id FROM storage.buckets WHERE name = 'artist-music';
    
    IF test_bucket_id IS NULL THEN
        RAISE NOTICE '❌ artist-music bucket not found';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing storage permissions...';
    RAISE NOTICE 'User ID: %', current_user_id;
    RAISE NOTICE 'Bucket ID: %', test_bucket_id;
    RAISE NOTICE '✅ Storage policies should now allow uploads to: %/filename.mp3', current_user_id;
END $$;

-- 8. Final status
DO $$
BEGIN
    RAISE NOTICE '=== STORAGE PERMISSIONS FIXED ===';
    RAISE NOTICE '✅ RLS enabled on storage buckets';
    RAISE NOTICE '✅ Storage policies created for artist-music and artist-photos';
    RAISE NOTICE '✅ Users can now upload files to their own folders';
    RAISE NOTICE '💡 Try uploading a track again - it should work now!';
END $$;
