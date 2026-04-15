set client_min_messages = warning;

-- =============================================
-- Artist Music System Migration
-- Creates tables for artist music uploads and management
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ARTIST MUSIC TABLE
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
-- MUSIC LIKES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS music_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(music_id, user_id)
);

-- =============================================
-- MUSIC COMMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS music_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES music_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE artist_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR ARTIST_MUSIC
-- =============================================

-- Public tracks are viewable by everyone
DROP POLICY IF EXISTS "Public music is viewable by everyone" ON artist_music;
CREATE POLICY "Public music is viewable by everyone" ON artist_music
  FOR SELECT USING (is_public = true);

-- Users can view their own music (public or private)
DROP POLICY IF EXISTS "Users can view their own music" ON artist_music;
CREATE POLICY "Users can view their own music" ON artist_music
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own music
DROP POLICY IF EXISTS "Users can insert their own music" ON artist_music;
CREATE POLICY "Users can insert their own music" ON artist_music
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own music
DROP POLICY IF EXISTS "Users can update their own music" ON artist_music;
CREATE POLICY "Users can update their own music" ON artist_music
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own music
DROP POLICY IF EXISTS "Users can delete their own music" ON artist_music;
CREATE POLICY "Users can delete their own music" ON artist_music
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES FOR MUSIC_LIKES
-- =============================================

-- Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view music likes" ON music_likes;
CREATE POLICY "Anyone can view music likes" ON music_likes
  FOR SELECT USING (true);

-- Users can like music
DROP POLICY IF EXISTS "Users can like music" ON music_likes;
CREATE POLICY "Users can like music" ON music_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike music they liked
DROP POLICY IF EXISTS "Users can unlike their own likes" ON music_likes;
CREATE POLICY "Users can unlike their own likes" ON music_likes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES FOR MUSIC_COMMENTS
-- =============================================

-- Anyone can view comments on public music
DROP POLICY IF EXISTS "Anyone can view music comments" ON music_comments;
CREATE POLICY "Anyone can view music comments" ON music_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM artist_music 
      WHERE artist_music.id = music_comments.music_id 
      AND (artist_music.is_public = true OR artist_music.user_id = auth.uid())
    )
  );

-- Users can comment on public music
DROP POLICY IF EXISTS "Users can comment on music" ON music_comments;
CREATE POLICY "Users can comment on music" ON music_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM artist_music 
      WHERE artist_music.id = music_comments.music_id 
      AND (artist_music.is_public = true OR artist_music.user_id = auth.uid())
    )
  );

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON music_comments;
CREATE POLICY "Users can update their own comments" ON music_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON music_comments;
CREATE POLICY "Users can delete their own comments" ON music_comments
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_artist_music_updated_at BEFORE UPDATE ON artist_music
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_comments_updated_at BEFORE UPDATE ON music_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STORAGE BUCKET POLICIES
-- =============================================

-- Note: Storage buckets and policies should be created via Supabase dashboard or storage setup script
-- This migration focuses on database tables only

-- =============================================
-- INDEXES FOR PERFORMANCE
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

-- Index for music comments
CREATE INDEX IF NOT EXISTS idx_music_comments_music_id ON music_comments(music_id);
CREATE INDEX IF NOT EXISTS idx_music_comments_user_id ON music_comments(user_id);
