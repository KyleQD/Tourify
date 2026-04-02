-- =============================================
-- Artist Storage Setup Migration
-- Creates storage buckets and policies for artist content
-- =============================================

-- =============================================
-- CREATE STORAGE BUCKETS
-- =============================================

-- Create artist-music bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-music',
  'artist-music',
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Create artist-photos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-photos',
  'artist-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES FOR ARTIST-MUSIC (PRIVATE)
-- =============================================

-- Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload music to own folder" ON storage.objects;
CREATE POLICY "Users can upload music to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own music files
DROP POLICY IF EXISTS "Users can view own music files" ON storage.objects;
CREATE POLICY "Users can view own music files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own music files
DROP POLICY IF EXISTS "Users can update own music files" ON storage.objects;
CREATE POLICY "Users can update own music files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own music files
DROP POLICY IF EXISTS "Users can delete own music files" ON storage.objects;
CREATE POLICY "Users can delete own music files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- STORAGE POLICIES FOR ARTIST-PHOTOS (PUBLIC)
-- =============================================

-- Users can upload photos to their own folder
DROP POLICY IF EXISTS "Users can upload photos to own folder" ON storage.objects;
CREATE POLICY "Users can upload photos to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view public photos
DROP POLICY IF EXISTS "Anyone can view artist photos" ON storage.objects;
CREATE POLICY "Anyone can view artist photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-photos');

-- Users can update their own photos
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- HELPER FUNCTIONS FOR STORAGE
-- =============================================

-- Function to test music upload permissions
CREATE OR REPLACE FUNCTION test_music_upload_permissions(user_id UUID, file_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user can upload to this path
  RETURN (
    user_id IS NOT NULL AND
    file_path LIKE user_id::text || '/%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace helpers if remote has older signatures (e.g. different param names)
DROP FUNCTION IF EXISTS is_valid_music_type(TEXT);
DROP FUNCTION IF EXISTS is_valid_image_type(TEXT) CASCADE;

-- Function to validate music file types
CREATE OR REPLACE FUNCTION is_valid_music_type(mime_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type = ANY(ARRAY[
    'audio/mpeg',
    'audio/wav', 
    'audio/flac',
    'audio/aac',
    'audio/m4a',
    'audio/ogg'
  ]);
END;
$$ LANGUAGE plpgsql;

-- Function to validate image file types
CREATE OR REPLACE FUNCTION is_valid_image_type(mime_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type = ANY(ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]);
END;
$$ LANGUAGE plpgsql;

-- Function to get artist storage stats
CREATE OR REPLACE FUNCTION get_artist_storage_stats(user_id UUID)
RETURNS TABLE (
  music_files_count BIGINT,
  music_total_size BIGINT,
  photo_files_count BIGINT,
  photo_total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(music.file_count, 0) as music_files_count,
    COALESCE(music.total_size, 0) as music_total_size,
    COALESCE(photos.file_count, 0) as photo_files_count,
    COALESCE(photos.total_size, 0) as photo_total_size
  FROM (
    SELECT 
      COUNT(*) as file_count,
      SUM(metadata->>'size')::BIGINT as total_size
    FROM storage.objects 
    WHERE bucket_id = 'artist-music' 
    AND (storage.foldername(name))[1] = user_id::text
  ) music
  CROSS JOIN (
    SELECT 
      COUNT(*) as file_count,
      SUM(metadata->>'size')::BIGINT as total_size
    FROM storage.objects 
    WHERE bucket_id = 'artist-photos' 
    AND (storage.foldername(name))[1] = user_id::text
  ) photos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_artist_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete music files that don't have corresponding database entries
  WITH orphaned_music AS (
    DELETE FROM storage.objects 
    WHERE bucket_id = 'artist-music'
    AND NOT EXISTS (
      SELECT 1 FROM artist_music 
      WHERE artist_music.file_url LIKE '%' || storage.objects.name
    )
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM orphaned_music;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
