-- =============================================================================
-- FIX STORAGE BUCKETS FOR PHOTO UPLOAD
-- =============================================================================
-- Run this in your Supabase SQL Editor to fix storage bucket issues
-- =============================================================================

-- Create post-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true, -- Public bucket for feed posts
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- RLS POLICIES FOR POST-MEDIA BUCKET
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Post media images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;

-- Allow anyone to view post media (public bucket)
CREATE POLICY "Post media images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post-media');

-- Allow authenticated users to upload post media
CREATE POLICY "Authenticated users can upload post media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own post media
CREATE POLICY "Users can update their own post media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own post media
CREATE POLICY "Users can delete their own post media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- VERIFY BUCKET EXISTS
-- =============================================================================

-- Check if the bucket was created successfully
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'post-media';

-- =============================================================================
-- TEST UPLOAD PERMISSIONS (Optional)
-- =============================================================================

-- This will show the current user's auth info (run this to verify auth is working)
SELECT auth.uid() as current_user_id, auth.role() as current_role;
