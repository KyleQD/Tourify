-- Tighten artist-music storage bucket policies
-- Ensure only the owner can directly access objects via RLS.
-- All public access goes through the application's signed URL endpoints.

-- Drop any overly permissive policies that may have been applied manually
DROP POLICY IF EXISTS "Users can view public music files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist music" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view artist music" ON storage.objects;

-- Ensure the bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'artist-music';

-- Owner-only SELECT: users can only read their own uploaded files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can view own music files'
  ) THEN
    CREATE POLICY "Users can view own music files" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'artist-music' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Owner-only INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can upload own music files'
  ) THEN
    CREATE POLICY "Users can upload own music files" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'artist-music' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Owner-only DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can delete own music files'
  ) THEN
    CREATE POLICY "Users can delete own music files" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'artist-music' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Note: do not COMMENT ON storage.objects here; Supabase owns that table and the
-- migration role typically lacks ownership (42501 on remote push).
