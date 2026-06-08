-- Ensure all music-related tables exist
-- Run this in your Supabase SQL Editor

-- Create music_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS music_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES music_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create music_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS music_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('profile', 'message', 'post', 'external')),
  share_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create music_plays table if it doesn't exist
CREATE TABLE IF NOT EXISTS music_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  music_id UUID REFERENCES artist_music(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  play_duration INTEGER,
  play_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'music', 'image', 'file')),
  music_id UUID REFERENCES artist_music(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'music', 'image', 'video', 'link')),
  music_id UUID REFERENCES artist_music(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE music_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create basic policies (if they don't exist)
DO $$
BEGIN
    -- Music comments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_comments' AND policyname = 'Anyone can view music comments') THEN
        CREATE POLICY "Anyone can view music comments" ON music_comments FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_comments' AND policyname = 'Users can manage their own comments') THEN
        CREATE POLICY "Users can manage their own comments" ON music_comments FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Music shares policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_shares' AND policyname = 'Anyone can view music shares') THEN
        CREATE POLICY "Anyone can view music shares" ON music_shares FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_shares' AND policyname = 'Users can manage their own shares') THEN
        CREATE POLICY "Users can manage their own shares" ON music_shares FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Music plays policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_plays' AND policyname = 'Anyone can view music plays') THEN
        CREATE POLICY "Anyone can view music plays" ON music_plays FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'music_plays' AND policyname = 'Users can manage their own plays') THEN
        CREATE POLICY "Users can manage their own plays" ON music_plays FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Messages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages they sent or received') THEN
        CREATE POLICY "Users can view messages they sent or received" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages') THEN
        CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
    END IF;
    
    -- Posts policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Anyone can view public posts') THEN
        CREATE POLICY "Anyone can view public posts" ON posts FOR SELECT USING (is_public = true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Users can manage their own posts') THEN
        CREATE POLICY "Users can manage their own posts" ON posts FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_music_comments_music_id ON music_comments(music_id);
CREATE INDEX IF NOT EXISTS idx_music_comments_user_id ON music_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_music_comments_parent_id ON music_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_music_shares_music_id ON music_shares(music_id);
CREATE INDEX IF NOT EXISTS idx_music_shares_user_id ON music_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_music_plays_music_id ON music_plays(music_id);
CREATE INDEX IF NOT EXISTS idx_music_plays_user_id ON music_plays(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_music_id ON messages(music_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_public ON posts(is_public);
CREATE INDEX IF NOT EXISTS idx_posts_music_id ON posts(music_id);
