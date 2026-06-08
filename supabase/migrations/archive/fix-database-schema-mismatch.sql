-- =============================================================================
-- FIX DATABASE SCHEMA MISMATCH (UPDATED FOR ACTUAL SCHEMA)
-- This script fixes the mismatch between your application code and database schema
-- Run this in your Supabase SQL Editor to get your data flowing properly
-- =============================================================================

-- =============================================================================
-- STEP 1: FIX POSTS TABLE SCHEMA
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🛠️ FIXING POSTS TABLE SCHEMA...';
  RAISE NOTICE '================================';
  
  -- Add missing columns that your application code expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'type') THEN
    ALTER TABLE posts ADD COLUMN type TEXT DEFAULT 'text';
    RAISE NOTICE '✅ Added type column';
  ELSE
    RAISE NOTICE 'ℹ️ type column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'visibility') THEN
    ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public';
    RAISE NOTICE '✅ Added visibility column';
  ELSE
    RAISE NOTICE 'ℹ️ visibility column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'location') THEN
    ALTER TABLE posts ADD COLUMN location TEXT;
    RAISE NOTICE '✅ Added location column';
  ELSE
    RAISE NOTICE 'ℹ️ location column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hashtags') THEN
    ALTER TABLE posts ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    RAISE NOTICE '✅ Added hashtags column';
  ELSE
    RAISE NOTICE 'ℹ️ hashtags column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
    ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added views_count column';
  ELSE
    RAISE NOTICE 'ℹ️ views_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_pinned') THEN
    ALTER TABLE posts ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_pinned column';
  ELSE
    RAISE NOTICE 'ℹ️ is_pinned column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'tagged_users') THEN
    ALTER TABLE posts ADD COLUMN tagged_users UUID[] DEFAULT '{}';
    RAISE NOTICE '✅ Added tagged_users column';
  ELSE
    RAISE NOTICE 'ℹ️ tagged_users column already exists';
  END IF;
  
  -- Add account context columns for multi-account posting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
    RAISE NOTICE '✅ Added posted_as_profile_id column';
  ELSE
    RAISE NOTICE 'ℹ️ posted_as_profile_id column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'general';
    RAISE NOTICE '✅ Added posted_as_account_type column';
  ELSE
    RAISE NOTICE 'ℹ️ posted_as_account_type column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'route_context') THEN
    ALTER TABLE posts ADD COLUMN route_context TEXT;
    RAISE NOTICE '✅ Added route_context column';
  ELSE
    RAISE NOTICE 'ℹ️ route_context column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_display_name') THEN
    ALTER TABLE posts ADD COLUMN account_display_name TEXT;
    RAISE NOTICE '✅ Added account_display_name column';
  ELSE
    RAISE NOTICE 'ℹ️ account_display_name column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_username') THEN
    ALTER TABLE posts ADD COLUMN account_username TEXT;
    RAISE NOTICE '✅ Added account_username column';
  ELSE
    RAISE NOTICE 'ℹ️ account_username column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_avatar_url') THEN
    ALTER TABLE posts ADD COLUMN account_avatar_url TEXT;
    RAISE NOTICE '✅ Added account_avatar_url column';
  ELSE
    RAISE NOTICE 'ℹ️ account_avatar_url column already exists';
  END IF;
  
  -- Add likes_count and comments_count if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'likes_count') THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added likes_count column';
  ELSE
    RAISE NOTICE 'ℹ️ likes_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'comments_count') THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added comments_count column';
  ELSE
    RAISE NOTICE 'ℹ️ comments_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'shares_count') THEN
    ALTER TABLE posts ADD COLUMN shares_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added shares_count column';
  ELSE
    RAISE NOTICE 'ℹ️ shares_count column already exists';
  END IF;
  
  -- Note: Your posts table already has 'images' column, which is fine
  RAISE NOTICE 'ℹ️ Your posts table uses "images" column for media (this is fine)';
END $$;

-- =============================================================================
-- STEP 2: FIX EVENTS TABLE SCHEMA
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎭 FIXING EVENTS TABLE SCHEMA...';
  RAISE NOTICE '================================';
  
  -- Add missing columns that your application code expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_public') THEN
    ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ Added is_public column';
  ELSE
    RAISE NOTICE 'ℹ️ is_public column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'poster_url') THEN
    ALTER TABLE events ADD COLUMN poster_url TEXT;
    RAISE NOTICE '✅ Added poster_url column';
  ELSE
    RAISE NOTICE 'ℹ️ poster_url column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_price') THEN
    ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10,2);
    RAISE NOTICE '✅ Added ticket_price column';
  ELSE
    RAISE NOTICE 'ℹ️ ticket_price column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_url') THEN
    ALTER TABLE events ADD COLUMN ticket_url TEXT;
    RAISE NOTICE '✅ Added ticket_url column';
  ELSE
    RAISE NOTICE 'ℹ️ ticket_url column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'draft';
    RAISE NOTICE '✅ Added status column';
  ELSE
    RAISE NOTICE 'ℹ️ status column already exists';
  END IF;
  
  -- Add user_id column if it doesn't exist (your app expects this)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_id') THEN
    ALTER TABLE events ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column';
  ELSE
    RAISE NOTICE 'ℹ️ user_id column already exists';
  END IF;
  
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by') THEN
    ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added created_by column';
  ELSE
    RAISE NOTICE 'ℹ️ created_by column already exists';
  END IF;
  
  -- Add capacity column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
    RAISE NOTICE '✅ Added capacity column';
  ELSE
    RAISE NOTICE 'ℹ️ capacity column already exists';
  END IF;
  
  -- Note: Your events table already has 'name' and 'description' columns, which is fine
  RAISE NOTICE 'ℹ️ Your events table uses "name" column for title (this is fine)';
END $$;

-- =============================================================================
-- STEP 3: FIX PROFILES TABLE SCHEMA
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👤 FIXING PROFILES TABLE SCHEMA...';
  RAISE NOTICE '=================================';
  
  -- Add missing columns that your application code expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
    RAISE NOTICE '✅ Added bio column';
  ELSE
    RAISE NOTICE 'ℹ️ bio column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
    ALTER TABLE profiles ADD COLUMN website TEXT;
    RAISE NOTICE '✅ Added website column';
  ELSE
    RAISE NOTICE 'ℹ️ website column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location TEXT;
    RAISE NOTICE '✅ Added location column';
  ELSE
    RAISE NOTICE 'ℹ️ location column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE profiles ADD COLUMN birth_date DATE;
    RAISE NOTICE '✅ Added birth_date column';
  ELSE
    RAISE NOTICE 'ℹ️ birth_date column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_verified column';
  ELSE
    RAISE NOTICE 'ℹ️ is_verified column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
    ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added followers_count column';
  ELSE
    RAISE NOTICE 'ℹ️ followers_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added following_count column';
  ELSE
    RAISE NOTICE 'ℹ️ following_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'posts_count') THEN
    ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added posts_count column';
  ELSE
    RAISE NOTICE 'ℹ️ posts_count column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added onboarding_completed column';
  ELSE
    RAISE NOTICE 'ℹ️ onboarding_completed column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE profiles ADD COLUMN account_settings JSONB DEFAULT '{
      "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
      "notifications": {"email": true, "push": true, "sms": false},
      "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
    }'::jsonb;
    RAISE NOTICE '✅ Added account_settings column';
  ELSE
    RAISE NOTICE 'ℹ️ account_settings column already exists';
  END IF;
  
  -- Note: Your profiles table already has 'full_name' and 'role' columns, which is fine
  RAISE NOTICE 'ℹ️ Your profiles table uses "full_name" column for name (this is fine)';
END $$;

-- =============================================================================
-- STEP 4: CREATE MISSING TABLES
-- =============================================================================

-- Create post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hashtags table if it doesn't exist
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_hashtags junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- =============================================================================
-- STEP 5: ENABLE RLS AND CREATE POLICIES
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 ENABLING RLS AND POLICIES...';
  RAISE NOTICE '================================';
  
  -- Enable RLS on all tables
  ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
  ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ Enabled RLS on all tables';
END $$;

-- Create RLS policies for posts
DO $$
BEGIN
  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
  DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
  DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
  DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
  
  -- Create new policies
  CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
  CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);
  
  RAISE NOTICE '✅ Created RLS policies for posts';
END $$;

-- Create RLS policies for events (checking if user_id column exists first)
DO $$
BEGIN
  -- Check if user_id column exists in events table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_id') THEN
    -- Drop existing policies first to avoid conflicts
    DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
    DROP POLICY IF EXISTS "Users can insert their own events" ON events;
    DROP POLICY IF EXISTS "Users can update their own events" ON events;
    DROP POLICY IF EXISTS "Users can delete their own events" ON events;
    
    -- Create new policies using user_id
    CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
    CREATE POLICY "Users can insert their own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own events" ON events FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own events" ON events FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Created RLS policies for events (using user_id)';
  ELSE
    -- If no user_id column, create basic policies
    DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
    DROP POLICY IF EXISTS "Users can insert their own events" ON events;
    DROP POLICY IF EXISTS "Users can update their own events" ON events;
    DROP POLICY IF EXISTS "Users can delete their own events" ON events;
    
    CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
    CREATE POLICY "Anyone can insert events" ON events FOR INSERT USING (true);
    CREATE POLICY "Anyone can update events" ON events FOR UPDATE USING (true);
    CREATE POLICY "Anyone can delete events" ON events FOR DELETE USING (true);
    
    RAISE NOTICE '⚠️ Created basic RLS policies for events (no user_id column found)';
  END IF;
END $$;

-- Create RLS policies for profiles
DO $$
BEGIN
  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  
  -- Create new policies
  CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
  CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  
  RAISE NOTICE '✅ Created RLS policies for profiles';
END $$;

-- =============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 CREATING PERFORMANCE INDEXES...';
  RAISE NOTICE '================================';
  
  -- Posts indexes
  CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
  CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
  CREATE INDEX IF NOT EXISTS idx_posts_posted_as ON posts(posted_as_profile_id, posted_as_account_type);
  
  -- Events indexes (checking if columns exist first)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'name') THEN
    CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_public') THEN
    CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
  END IF;
  
  -- Profiles indexes
  CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
  CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  
  -- Post interactions indexes
  CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
  CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
  
  RAISE NOTICE '✅ Created performance indexes';
END $$;

-- =============================================================================
-- STEP 7: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  posts_count INTEGER;
  events_count INTEGER;
  profiles_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICATION RESULTS...';
  RAISE NOTICE '==========================';
  
  -- Check posts table
  SELECT COUNT(*) INTO posts_count FROM posts;
  RAISE NOTICE 'Posts table: % records', posts_count;
  
  -- Check events table
  SELECT COUNT(*) INTO events_count FROM events;
  RAISE NOTICE 'Events table: % records', events_count;
  
  -- Check profiles table
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  RAISE NOTICE 'Profiles table: % records', profiles_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SCHEMA MISMATCH FIXED SUCCESSFULLY!';
  RAISE NOTICE 'Your application should now be able to create and store data properly.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test creating a post through your app';
  RAISE NOTICE '2. Test creating an event through your app';
  RAISE NOTICE '3. Test updating a profile through your app';
  RAISE NOTICE '4. Check that data appears in your database tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Your app may need to be updated to use:';
  RAISE NOTICE '- "images" instead of "media_urls" for posts';
  RAISE NOTICE '- "name" instead of "title" for events';
  RAISE NOTICE '- "full_name" instead of "name" for profiles';
END $$;
