set client_min_messages = warning;

-- =============================================================================
-- Comprehensive Storage Buckets Migration
-- Creates all application storage buckets that were previously only defined in
-- ad-hoc SQL scripts and not tracked in the migration chain. Safe to run on
-- databases where some buckets already exist (ON CONFLICT DO NOTHING).
-- All policies use DROP POLICY IF EXISTS to prevent duplicate-policy errors
-- on replay or partial application.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BUCKETS
-- ---------------------------------------------------------------------------

-- avatars: public profile photos for all user types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- post-media: public images / short video attached to feed posts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 'post-media', true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- venue-media: public venue photos / banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-media', 'venue-media', true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- event-media: public event flyers, photos, promo images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media', 'event-media', true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- documents: private general-purpose documents (contracts, PDFs, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false,
  26214400,  -- 25 MB
  ARRAY['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/rtf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- portfolio: private artist / venue portfolio items
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio', 'portfolio', false,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- artist-videos: private artist promo / performance videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-videos', 'artist-videos', false,
  524288000,  -- 500 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- artist-documents: private artist business documents (rider, press kit, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-documents', 'artist-documents', false,
  26214400,  -- 25 MB
  ARRAY['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/rtf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- artist-merchandise: public merch product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-merchandise', 'artist-merchandise', true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- venue-documents: private venue-specific documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-documents', 'venue-documents', false,
  26214400,  -- 25 MB
  ARRAY['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/rtf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- ---------------------------------------------------------------------------
-- RLS POLICIES — avatars
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: owner insert" ON storage.objects;
CREATE POLICY "avatars: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;
CREATE POLICY "avatars: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;
CREATE POLICY "avatars: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — post-media
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "post-media: public read" ON storage.objects;
CREATE POLICY "post-media: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post-media: authenticated insert" ON storage.objects;
CREATE POLICY "post-media: authenticated insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post-media: owner update" ON storage.objects;
CREATE POLICY "post-media: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post-media: owner delete" ON storage.objects;
CREATE POLICY "post-media: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — venue-media
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "venue-media: public read" ON storage.objects;
CREATE POLICY "venue-media: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'venue-media');

DROP POLICY IF EXISTS "venue-media: authenticated insert" ON storage.objects;
CREATE POLICY "venue-media: authenticated insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'venue-media');

DROP POLICY IF EXISTS "venue-media: owner update" ON storage.objects;
CREATE POLICY "venue-media: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'venue-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "venue-media: owner delete" ON storage.objects;
CREATE POLICY "venue-media: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'venue-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — event-media
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "event-media: public read" ON storage.objects;
CREATE POLICY "event-media: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "event-media: authenticated insert" ON storage.objects;
CREATE POLICY "event-media: authenticated insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-media');

DROP POLICY IF EXISTS "event-media: owner update" ON storage.objects;
CREATE POLICY "event-media: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "event-media: owner delete" ON storage.objects;
CREATE POLICY "event-media: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — documents (private)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "documents: owner read" ON storage.objects;
CREATE POLICY "documents: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "documents: owner insert" ON storage.objects;
CREATE POLICY "documents: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "documents: owner update" ON storage.objects;
CREATE POLICY "documents: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "documents: owner delete" ON storage.objects;
CREATE POLICY "documents: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- service_role can manage all documents (for server-side operations)
DROP POLICY IF EXISTS "documents: service_role all" ON storage.objects;
CREATE POLICY "documents: service_role all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- ---------------------------------------------------------------------------
-- RLS POLICIES — portfolio (private)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "portfolio: owner read" ON storage.objects;
CREATE POLICY "portfolio: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "portfolio: owner insert" ON storage.objects;
CREATE POLICY "portfolio: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "portfolio: owner update" ON storage.objects;
CREATE POLICY "portfolio: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "portfolio: owner delete" ON storage.objects;
CREATE POLICY "portfolio: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — artist-videos (private)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "artist-videos: owner read" ON storage.objects;
CREATE POLICY "artist-videos: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'artist-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-videos: owner insert" ON storage.objects;
CREATE POLICY "artist-videos: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artist-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-videos: owner update" ON storage.objects;
CREATE POLICY "artist-videos: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artist-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-videos: owner delete" ON storage.objects;
CREATE POLICY "artist-videos: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'artist-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-videos: service_role all" ON storage.objects;
CREATE POLICY "artist-videos: service_role all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'artist-videos')
  WITH CHECK (bucket_id = 'artist-videos');

-- ---------------------------------------------------------------------------
-- RLS POLICIES — artist-documents (private)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "artist-documents: owner read" ON storage.objects;
CREATE POLICY "artist-documents: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-documents: owner insert" ON storage.objects;
CREATE POLICY "artist-documents: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-documents: owner update" ON storage.objects;
CREATE POLICY "artist-documents: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-documents: owner delete" ON storage.objects;
CREATE POLICY "artist-documents: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-documents: service_role all" ON storage.objects;
CREATE POLICY "artist-documents: service_role all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'artist-documents')
  WITH CHECK (bucket_id = 'artist-documents');

-- ---------------------------------------------------------------------------
-- RLS POLICIES — artist-merchandise (public)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "artist-merchandise: public read" ON storage.objects;
CREATE POLICY "artist-merchandise: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-merchandise');

DROP POLICY IF EXISTS "artist-merchandise: owner insert" ON storage.objects;
CREATE POLICY "artist-merchandise: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artist-merchandise'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-merchandise: owner update" ON storage.objects;
CREATE POLICY "artist-merchandise: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artist-merchandise'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "artist-merchandise: owner delete" ON storage.objects;
CREATE POLICY "artist-merchandise: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'artist-merchandise'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- RLS POLICIES — venue-documents (private)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "venue-documents: owner read" ON storage.objects;
CREATE POLICY "venue-documents: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'venue-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "venue-documents: owner insert" ON storage.objects;
CREATE POLICY "venue-documents: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'venue-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "venue-documents: owner update" ON storage.objects;
CREATE POLICY "venue-documents: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'venue-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "venue-documents: owner delete" ON storage.objects;
CREATE POLICY "venue-documents: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'venue-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "venue-documents: service_role all" ON storage.objects;
CREATE POLICY "venue-documents: service_role all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'venue-documents')
  WITH CHECK (bucket_id = 'venue-documents');
