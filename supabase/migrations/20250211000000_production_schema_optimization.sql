-- ============================================================================= 
-- PRODUCTION SCHEMA OPTIMIZATION
-- This migration consolidates the database schema for production readiness
-- ============================================================================= 

-- 1. Ensure profiles table has all required columns
-- ============================================================================= 
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'general' 
    CHECK (account_type IN ('general', 'artist', 'venue', 'organization'));

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS cover_image TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- 2. Add performance indexes
-- ============================================================================= 
CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON profiles(username);

CREATE INDEX IF NOT EXISTS idx_profiles_account_type 
  ON profiles(account_type);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
  ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target_id 
  ON follow_requests(target_id);

CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id 
  ON follow_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_follow_requests_status 
  ON follow_requests(status);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
  ON follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id 
  ON follows(following_id);

-- 3. Add artist_profiles indexes
-- ============================================================================= 
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id 
  ON artist_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_artist_name 
  ON artist_profiles(artist_name);

-- 4. Ensure RLS policies are optimized
-- ============================================================================= 
-- Profiles: Anyone can view, users can update their own
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

-- 5. Add helper function to get profile with stats
-- ============================================================================= 
CREATE OR REPLACE FUNCTION get_profile_with_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'full_name', p.full_name,
    'bio', p.bio,
    'avatar_url', p.avatar_url,
    'cover_image', p.cover_image,
    'location', p.location,
    'website', p.website,
    'account_type', p.account_type,
    'is_verified', p.is_verified,
    'followers_count', COALESCE(p.followers_count, 0),
    'following_count', COALESCE(p.following_count, 0),
    'posts_count', COALESCE(p.posts_count, 0),
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO result
  FROM profiles p
  WHERE p.id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add function to update follower counts
-- ============================================================================= 
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    -- Increment followers count for following
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0) 
    WHERE id = OLD.follower_id;
    
    -- Decrement followers count for following
    UPDATE profiles 
    SET followers_count = GREATEST(followers_count - 1, 0) 
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follower counts
DROP TRIGGER IF EXISTS trigger_update_follower_counts ON follows;
CREATE TRIGGER trigger_update_follower_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- 7. Add function to update post counts
-- ============================================================================= 
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET posts_count = posts_count + 1 
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET posts_count = GREATEST(posts_count - 1, 0) 
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post counts (if posts table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    DROP TRIGGER IF EXISTS trigger_update_post_counts ON posts;
    CREATE TRIGGER trigger_update_post_counts
      AFTER INSERT OR DELETE ON posts
      FOR EACH ROW
      EXECUTE FUNCTION update_post_counts();
  END IF;
END $$;

-- 8. Verify and log completion
-- ============================================================================= 
DO $$ 
BEGIN
  RAISE NOTICE 'Production schema optimization completed successfully';
  RAISE NOTICE 'Added missing columns to profiles table';
  RAISE NOTICE 'Created performance indexes';
  RAISE NOTICE 'Updated RLS policies';
  RAISE NOTICE 'Added helper functions for profile stats';
END $$;



