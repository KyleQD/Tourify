-- =============================================
-- ARTIST MUSIC UPLOAD FIX
-- Run this script in your Supabase SQL Editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CREATE ARTIST_MUSIC TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS artist_music (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('single', 'album', 'ep', 'mixtape')),
  genre TEXT,
  release_date DATE,
  duration INTEGER, -- in seconds
  file_url TEXT,
  cover_art_url TEXT,
  spotify_url TEXT,
  apple_music_url TEXT,
  soundcloud_url TEXT,
  youtube_url TEXT,
  lyrics TEXT,
  credits JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}', -- BPM, key, commerce info, etc.
  stats JSONB DEFAULT '{
    "plays": 0,
    "likes": 0,
    "downloads": 0,
    "shares": 0,
    "comments": 0
  }',
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================
-- CREATE MUSIC_LIKES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS music_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(music_id, user_id)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE artist_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES (IF ANY)
-- =============================================

DROP POLICY IF EXISTS "Public music is viewable by everyone" ON artist_music;
DROP POLICY IF EXISTS "Users can view their own music" ON artist_music;
DROP POLICY IF EXISTS "Users can insert their own music" ON artist_music;
DROP POLICY IF EXISTS "Users can update their own music" ON artist_music;
DROP POLICY IF EXISTS "Users can delete their own music" ON artist_music;

DROP POLICY IF EXISTS "Anyone can view music likes" ON music_likes;
DROP POLICY IF EXISTS "Users can like music" ON music_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON music_likes;

-- =============================================
-- CREATE RLS POLICIES FOR ARTIST_MUSIC
-- =============================================

-- Public tracks are viewable by everyone
CREATE POLICY "Public music is viewable by everyone" ON artist_music
  FOR SELECT USING (is_public = true);

-- Users can view their own music (public or private)
CREATE POLICY "Users can view their own music" ON artist_music
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own music
CREATE POLICY "Users can insert their own music" ON artist_music
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own music
CREATE POLICY "Users can update their own music" ON artist_music
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own music
CREATE POLICY "Users can delete their own music" ON artist_music
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CREATE RLS POLICIES FOR MUSIC_LIKES
-- =============================================

-- Anyone can view likes
CREATE POLICY "Anyone can view music likes" ON music_likes
  FOR SELECT USING (true);

-- Users can like music
CREATE POLICY "Users can like music" ON music_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike music they liked
CREATE POLICY "Users can unlike their own likes" ON music_likes
  FOR DELETE USING (auth.uid() = user_id);

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
-- DROP EXISTING STORAGE POLICIES (IF ANY)
-- =============================================

DROP POLICY IF EXISTS "Users can upload music to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own music files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own music files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own music files" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload photos to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- =============================================
-- CREATE STORAGE POLICIES FOR ARTIST-MUSIC (PRIVATE)
-- =============================================

-- Users can upload to their own folder
CREATE POLICY "Users can upload music to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own music files
CREATE POLICY "Users can view own music files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own music files
CREATE POLICY "Users can update own music files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own music files
CREATE POLICY "Users can delete own music files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artist-music' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- CREATE STORAGE POLICIES FOR ARTIST-PHOTOS (PUBLIC)
-- =============================================

-- Users can upload photos to their own folder
CREATE POLICY "Users can upload photos to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view public photos
CREATE POLICY "Anyone can view artist photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-photos');

-- Users can update their own photos
CREATE POLICY "Users can update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artist-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- CREATE HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_artist_music_updated_at ON artist_music;
CREATE TRIGGER update_artist_music_updated_at BEFORE UPDATE ON artist_music
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get enhanced artist stats (used by the app)
CREATE OR REPLACE FUNCTION get_enhanced_artist_stats(artist_user_id UUID)
RETURNS TABLE (
  musicCount BIGINT,
  videoCount BIGINT,
  photoCount BIGINT,
  blogCount BIGINT,
  totalPlays BIGINT,
  totalLikes BIGINT,
  totalFollowers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM artist_music WHERE user_id = artist_user_id), 0) as musicCount,
    0::BIGINT as videoCount, -- Placeholder for future video table
    0::BIGINT as photoCount, -- Placeholder for future photo table  
    COALESCE((SELECT COUNT(*) FROM artist_blog_posts WHERE user_id = artist_user_id), 0) as blogCount,
    COALESCE((SELECT SUM((stats->>'plays')::BIGINT) FROM artist_music WHERE user_id = artist_user_id), 0) as totalPlays,
    COALESCE((SELECT SUM((stats->>'likes')::BIGINT) FROM artist_music WHERE user_id = artist_user_id), 0) as totalLikes,
    0::BIGINT as totalFollowers; -- Placeholder for future followers system
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Index for user's music
CREATE INDEX IF NOT EXISTS idx_artist_music_user_id ON artist_music(user_id);

-- Index for public music
CREATE INDEX IF NOT EXISTS idx_artist_music_public ON artist_music(is_public) WHERE is_public = true;

-- Index for featured music
CREATE INDEX IF NOT EXISTS idx_artist_music_featured ON artist_music(is_featured) WHERE is_featured = true;

-- Index for music by genre
CREATE INDEX IF NOT EXISTS idx_artist_music_genre ON artist_music(genre) WHERE genre IS NOT NULL;

-- Index for music likes
CREATE INDEX IF NOT EXISTS idx_music_likes_music_id ON music_likes(music_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_user_id ON music_likes(user_id);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Artist music upload system setup complete!';
  RAISE NOTICE 'Tables created: artist_music, music_likes';
  RAISE NOTICE 'Storage buckets created: artist-music (private), artist-photos (public)';
  RAISE NOTICE 'RLS policies and storage policies configured';
  RAISE NOTICE 'You can now upload music tracks through the /artist/music page';
END $$;
