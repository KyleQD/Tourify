-- Fix Posts Schema Migration (Database-Aware Version)
-- Run this in your Supabase SQL Editor
-- This script checks existing structure and safely adds missing components

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(p_table_name TEXT, p_column_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = p_column_name
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROFILES TABLE SETUP & ENHANCEMENT
-- =============================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles table
DO $$ 
BEGIN
  -- Add standard columns if they don't exist
  IF NOT column_exists('profiles', 'username') THEN
    ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
  
  IF NOT column_exists('profiles', 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;
  
  IF NOT column_exists('profiles', 'name') THEN
    ALTER TABLE profiles ADD COLUMN name TEXT;
  END IF;
  
  IF NOT column_exists('profiles', 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT column_exists('profiles', 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT column_exists('profiles', 'website') THEN
    ALTER TABLE profiles ADD COLUMN website TEXT;
  END IF;
  
  IF NOT column_exists('profiles', 'metadata') THEN
    ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  
  IF NOT column_exists('profiles', 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT column_exists('profiles', 'followers_count') THEN
    ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT column_exists('profiles', 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT column_exists('profiles', 'posts_count') THEN
    ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
  END IF;
  
  RAISE NOTICE '✅ Enhanced profiles table with missing columns';
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (using safe approach)
DO $$ 
BEGIN
  -- Drop existing policies first
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  
  -- Create new policies
  CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);
    
  CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE USING (auth.uid() = id);
    
  CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    
  RAISE NOTICE '✅ Created RLS policies for profiles';
END $$;

-- =============================================================================
-- POSTS TABLE SETUP WITH PROPER FOREIGN KEYS
-- =============================================================================

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'poll', 'event')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  location TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add proper foreign key constraint with explicit name for Supabase
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'posts_user_id_fkey') THEN
    ALTER TABLE posts DROP CONSTRAINT posts_user_id_fkey;
  END IF;
  
  -- Add named foreign key constraint
  ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  
  RAISE NOTICE '✅ Added foreign key constraint posts_user_id_fkey';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ Foreign key constraint already exists';
END $$;

-- Enable RLS on posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for posts (using safe approach)
DO $$ 
BEGIN
  -- Drop existing policies first
  DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;
  DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
  DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
  DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
  DROP POLICY IF EXISTS "Users can view all posts" ON posts;
  DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;
  
  -- Create new policies
  CREATE POLICY "Anyone can view public posts" 
    ON posts FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
    
  CREATE POLICY "Users can create their own posts" 
    ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
    
  CREATE POLICY "Users can update their own posts" 
    ON posts FOR UPDATE USING (auth.uid() = user_id);
    
  CREATE POLICY "Users can delete their own posts" 
    ON posts FOR DELETE USING (auth.uid() = user_id);
    
  RAISE NOTICE '✅ Created RLS policies for posts';
END $$;

-- =============================================================================
-- POST LIKES TABLE SETUP
-- =============================================================================

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Add proper foreign key constraints
DO $$
BEGIN
  -- Add foreign key to posts
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'post_likes_post_id_fkey') THEN
    ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
  
  -- Add foreign key to users
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'post_likes_user_id_fkey') THEN
    ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  RAISE NOTICE '✅ Added foreign key constraints for post_likes';
END $$;

-- Enable RLS on post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_likes
DO $$ 
BEGIN
  -- Drop existing policies first
  DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
  DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
  DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
  
  -- Create new policies
  CREATE POLICY "Anyone can view likes" 
    ON post_likes FOR SELECT USING (true);
    
  CREATE POLICY "Users can like posts" 
    ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    
  CREATE POLICY "Users can unlike posts" 
    ON post_likes FOR DELETE USING (auth.uid() = user_id);
    
  RAISE NOTICE '✅ Created RLS policies for post_likes';
END $$;

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, name, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    'Welcome to my profile!'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just return NEW to allow user creation
    RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING gin(hashtags);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =============================================================================
-- ENSURE EXISTING USERS HAVE PROFILES
-- =============================================================================

-- Insert profile for existing users if they don't have one
DO $$
DECLARE
  user_record RECORD;
  profile_exists BOOLEAN;
BEGIN
  FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_record.id) INTO profile_exists;
    
    IF NOT profile_exists THEN
      BEGIN
        INSERT INTO profiles (id, username, full_name, name, bio, created_at, updated_at)
        VALUES (
          user_record.id,
          COALESCE(user_record.raw_user_meta_data->>'username', 'user_' || substring(user_record.id::text, 1, 8)),
          COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
          COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', 'User'),
          'Welcome to my profile!',
          NOW(),
          NOW()
        );
        RAISE NOTICE 'Created profile for user: %', user_record.id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Could not create profile for user %: %', user_record.id, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PERMISSIONS & FINAL SETUP
-- =============================================================================

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON post_likes TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Clean up utility function
DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT);

-- Success message with database status
DO $$ 
DECLARE
  profiles_count INTEGER;
  posts_count INTEGER;
  likes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  SELECT COUNT(*) INTO posts_count FROM posts;
  SELECT COUNT(*) INTO likes_count FROM post_likes;
  
  RAISE NOTICE '✅ Posts schema migration completed successfully!';
  RAISE NOTICE '📝 Tables configured: profiles, posts, post_likes';
  RAISE NOTICE '🔗 Foreign key relationships established';
  RAISE NOTICE '🔒 RLS policies configured for all tables';
  RAISE NOTICE '🚀 API endpoints ready for post creation';
  RAISE NOTICE '';
  RAISE NOTICE 'Current database status:';
  RAISE NOTICE '- Profiles: % records', profiles_count;
  RAISE NOTICE '- Posts: % records', posts_count;
  RAISE NOTICE '- Post Likes: % records', likes_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now create posts through the application!';
END $$; 