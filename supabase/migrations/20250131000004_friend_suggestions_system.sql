-- Migration for Friend Suggestions System
-- This migration ensures all necessary tables and indexes exist for the friend suggestions system

-- Create follow_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CHECK (requester_id != target_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_id ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_created_at ON follow_requests(created_at);

-- Create indexes for follows table if they don't exist
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

-- Create indexes for profiles table if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_followers_count ON profiles(followers_count);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- Enable RLS on follow_requests table
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for follow_requests
CREATE POLICY "Users can view their own follow requests" ON follow_requests
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_id
  );

CREATE POLICY "Users can create follow requests" ON follow_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own follow requests" ON follow_requests
  FOR UPDATE USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_id
  );

CREATE POLICY "Users can delete their own follow requests" ON follow_requests
  FOR DELETE USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_id
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for follow_requests updated_at
CREATE TRIGGER update_follow_requests_updated_at
  BEFORE UPDATE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create follow when request is accepted
CREATE OR REPLACE FUNCTION handle_follow_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Create follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- Update follower counts
    UPDATE profiles 
    SET followers_count = followers_count + 1
    WHERE id = NEW.target_id;
    
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.requester_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for follow request acceptance
CREATE TRIGGER trigger_follow_request_accepted
  AFTER UPDATE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request_accepted();

-- Create function to handle follow request rejection/deletion
CREATE OR REPLACE FUNCTION handle_follow_request_rejected()
RETURNS TRIGGER AS $$
BEGIN
  -- If request was accepted and is now being rejected/deleted, remove follow
  IF OLD.status = 'accepted' AND (NEW.status = 'rejected' OR NEW.status IS NULL) THEN
    -- Remove follow relationship
    DELETE FROM follows 
    WHERE follower_id = OLD.requester_id 
    AND following_id = OLD.target_id;
    
    -- Update follower counts
    UPDATE profiles 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.target_id;
    
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.requester_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for follow request rejection/deletion
CREATE TRIGGER trigger_follow_request_rejected
  AFTER UPDATE OR DELETE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request_rejected();

-- Create function to update follower counts when follows are created/deleted
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE profiles 
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE profiles 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for follows table
CREATE TRIGGER trigger_follows_insert
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

CREATE TRIGGER trigger_follows_delete
  AFTER DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Ensure profiles table has the necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create a view for friend suggestions with better performance
CREATE OR REPLACE VIEW friend_suggestions_view AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.location,
  p.is_verified,
  p.followers_count,
  p.following_count,
  p.created_at,
  p.metadata,
  -- Calculate relevance score
  (
    COALESCE(p.followers_count, 0) * 0.1 +
    CASE WHEN p.is_verified THEN 5 ELSE 0 END +
    CASE WHEN p.bio IS NOT NULL AND LENGTH(p.bio) > 10 THEN 2 ELSE 0 END +
    CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END
  ) as base_relevance_score
FROM profiles p
WHERE p.username IS NOT NULL 
  AND p.full_name IS NOT NULL
  AND p.full_name != 'Anonymous User';

-- Grant necessary permissions
GRANT SELECT ON friend_suggestions_view TO authenticated;
GRANT ALL ON follow_requests TO authenticated;
GRANT ALL ON follows TO authenticated;

