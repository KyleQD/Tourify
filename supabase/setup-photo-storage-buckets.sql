-- =============================================================================
-- PHOTO STORAGE BUCKETS SETUP
-- =============================================================================
-- This script sets up storage buckets for the tiered photo system
-- Run this in your Supabase Dashboard > Storage or SQL Editor
-- =============================================================================

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Full Resolution Photos Bucket (Private - only accessible by owner or purchaser)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos-full-res',
  'photos-full-res',
  false, -- Private bucket
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Preview Photos Bucket (Public - optimized for web viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos-preview',
  'photos-preview',
  true, -- Public bucket
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Thumbnail Photos Bucket (Public - small thumbnails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos-thumbnail',
  'photos-thumbnail',
  true, -- Public bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Watermarked Photos Bucket (Public - for photographer marketplace previews)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos-watermarked',
  'photos-watermarked',
  true, -- Public bucket
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES - FULL RES BUCKET
-- =============================================================================

-- Allow users to view their own full-res photos
DROP POLICY IF EXISTS "Users can view their own full-res photos" ON storage.objects;
CREATE POLICY "Users can view their own full-res photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos-full-res' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users who purchased the photo to view it
DROP POLICY IF EXISTS "Buyers can view purchased full-res photos" ON storage.objects;
CREATE POLICY "Buyers can view purchased full-res photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos-full-res'
  AND EXISTS (
    SELECT 1 FROM photo_purchases pp
    INNER JOIN photos p ON pp.photo_id = p.id
    WHERE pp.buyer_user_id = auth.uid()
    AND pp.payment_status = 'completed'
    AND p.full_res_url LIKE '%' || name || '%'
  )
);

-- Allow users to upload their own full-res photos
DROP POLICY IF EXISTS "Users can upload their own full-res photos" ON storage.objects;
CREATE POLICY "Users can upload their own full-res photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-full-res' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own full-res photos
DROP POLICY IF EXISTS "Users can update their own full-res photos" ON storage.objects;
CREATE POLICY "Users can update their own full-res photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos-full-res' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own full-res photos
DROP POLICY IF EXISTS "Users can delete their own full-res photos" ON storage.objects;
CREATE POLICY "Users can delete their own full-res photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos-full-res' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES - PREVIEW BUCKET
-- =============================================================================

-- Preview photos are publicly viewable
DROP POLICY IF EXISTS "Preview photos are publicly viewable" ON storage.objects;
CREATE POLICY "Preview photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos-preview');

-- Allow authenticated users to upload preview photos
DROP POLICY IF EXISTS "Users can upload preview photos" ON storage.objects;
CREATE POLICY "Users can upload preview photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-preview' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own preview photos
DROP POLICY IF EXISTS "Users can update their own preview photos" ON storage.objects;
CREATE POLICY "Users can update their own preview photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos-preview' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own preview photos
DROP POLICY IF EXISTS "Users can delete their own preview photos" ON storage.objects;
CREATE POLICY "Users can delete their own preview photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos-preview' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES - THUMBNAIL BUCKET
-- =============================================================================

-- Thumbnail photos are publicly viewable
DROP POLICY IF EXISTS "Thumbnail photos are publicly viewable" ON storage.objects;
CREATE POLICY "Thumbnail photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos-thumbnail');

-- Allow authenticated users to upload thumbnail photos
DROP POLICY IF EXISTS "Users can upload thumbnail photos" ON storage.objects;
CREATE POLICY "Users can upload thumbnail photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-thumbnail' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own thumbnail photos
DROP POLICY IF EXISTS "Users can update their own thumbnail photos" ON storage.objects;
CREATE POLICY "Users can update their own thumbnail photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos-thumbnail' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own thumbnail photos
DROP POLICY IF EXISTS "Users can delete their own thumbnail photos" ON storage.objects;
CREATE POLICY "Users can delete their own thumbnail photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos-thumbnail' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES - WATERMARKED BUCKET
-- =============================================================================

-- Watermarked photos are publicly viewable
DROP POLICY IF EXISTS "Watermarked photos are publicly viewable" ON storage.objects;
CREATE POLICY "Watermarked photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos-watermarked');

-- Allow authenticated users to upload watermarked photos
DROP POLICY IF EXISTS "Users can upload watermarked photos" ON storage.objects;
CREATE POLICY "Users can upload watermarked photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-watermarked' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own watermarked photos
DROP POLICY IF EXISTS "Users can update their own watermarked photos" ON storage.objects;
CREATE POLICY "Users can update their own watermarked photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos-watermarked' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own watermarked photos
DROP POLICY IF EXISTS "Users can delete their own watermarked photos" ON storage.objects;
CREATE POLICY "Users can delete their own watermarked photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos-watermarked' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to generate secure download URL for purchased photos
CREATE OR REPLACE FUNCTION generate_secure_download_url(
  purchase_id UUID,
  expiry_hours INTEGER DEFAULT 24
)
RETURNS TEXT AS $$
DECLARE
  photo_path TEXT;
  signed_url TEXT;
BEGIN
  -- Get the photo path from the purchase
  SELECT p.full_res_url INTO photo_path
  FROM photo_purchases pp
  INNER JOIN photos p ON pp.photo_id = p.id
  WHERE pp.id = purchase_id
  AND pp.buyer_user_id = auth.uid()
  AND pp.payment_status = 'completed';
  
  IF photo_path IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- In production, this would generate a signed URL with expiry
  -- For now, return the path (implement signed URL generation in application code)
  RETURN photo_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access full-res photo
CREATE OR REPLACE FUNCTION can_access_full_res_photo(
  photo_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the owner
  IF EXISTS (
    SELECT 1 FROM photos
    WHERE id = photo_uuid
    AND user_id = user_uuid
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user purchased the photo
  IF EXISTS (
    SELECT 1 FROM photo_purchases
    WHERE photo_id = photo_uuid
    AND buyer_user_id = user_uuid
    AND payment_status = 'completed'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STORAGE STATISTICS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW photo_storage_stats AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_size_mb,
  ROUND(AVG((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as avg_size_mb
FROM storage.objects
WHERE bucket_id IN ('photos-full-res', 'photos-preview', 'photos-thumbnail', 'photos-watermarked')
GROUP BY bucket_id;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION generate_secure_download_url IS 'Generates a secure, time-limited download URL for purchased photos';
COMMENT ON FUNCTION can_access_full_res_photo IS 'Checks if a user has permission to access the full-resolution version of a photo';
COMMENT ON VIEW photo_storage_stats IS 'Provides statistics on photo storage usage across all buckets';

-- =============================================================================
-- COMPLETE
-- =============================================================================

-- Verify buckets were created
SELECT 
  id,
  name,
  public,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  created_at
FROM storage.buckets
WHERE id IN ('photos-full-res', 'photos-preview', 'photos-thumbnail', 'photos-watermarked')
ORDER BY id;

