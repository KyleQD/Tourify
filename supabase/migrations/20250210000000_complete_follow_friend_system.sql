-- ============================================================================= 
-- COMPLETE FOLLOW/FRIEND REQUEST SYSTEM
-- This migration ensures the complete ecosystem for follow requests is set up
-- ============================================================================= 

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================= 
-- 1. NOTIFICATIONS TABLE - Ensure all required columns exist
-- ============================================================================= 

-- Add missing columns to notifications table (safe to run multiple times)
DO $$ 
BEGIN
  -- Add summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'summary'
  ) THEN
    ALTER TABLE notifications ADD COLUMN summary TEXT;
  END IF;

  -- Add related_user_id with foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_user_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add related_content_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_content_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_content_id UUID;
  END IF;

  -- Add related_content_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_content_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_content_type TEXT;
  END IF;

  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;

  -- Add is_read boolean column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Migrate existing data: set is_read based on read_at if is_read was just added
UPDATE notifications 
SET is_read = (read_at IS NOT NULL)
WHERE is_read IS NULL;

-- Add check constraint for priority (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'notifications_priority_check'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_user_id ON notifications(related_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- ============================================================================= 
-- 2. FOLLOW_REQUESTS TABLE - Ensure it exists with proper structure
-- ============================================================================= 

CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CHECK (requester_id != target_id)
);

-- Create indexes for follow_requests
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_id ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_created_at ON follow_requests(created_at DESC);

-- ============================================================================= 
-- 3. FOLLOWS TABLE - Ensure it exists
-- ============================================================================= 

CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create indexes for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- ============================================================================= 
-- 4. RLS POLICIES - Proper security policies
-- ============================================================================= 

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS notif_read_own ON notifications;
DROP POLICY IF EXISTS notif_write_own ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;

DROP POLICY IF EXISTS follow_requests_select ON follow_requests;
DROP POLICY IF EXISTS follow_requests_insert ON follow_requests;
DROP POLICY IF EXISTS follow_requests_update ON follow_requests;
DROP POLICY IF EXISTS follow_requests_delete ON follow_requests;

DROP POLICY IF EXISTS follows_select ON follows;
DROP POLICY IF EXISTS follows_insert ON follows;
DROP POLICY IF EXISTS follows_delete ON follows;

-- NOTIFICATIONS POLICIES
-- Users can read their own notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Allow INSERT from authenticated users (for direct API calls)
-- Note: Triggers use SECURITY DEFINER so they bypass this
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- FOLLOW_REQUESTS POLICIES
-- Users can view follow requests they sent or received
CREATE POLICY follow_requests_select ON follow_requests
  FOR SELECT USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

-- Users can create follow requests (as the requester)
CREATE POLICY follow_requests_insert ON follow_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

-- Users can update follow requests they're involved in
CREATE POLICY follow_requests_update ON follow_requests
  FOR UPDATE USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  ) WITH CHECK (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

-- Users can delete follow requests they created or received
CREATE POLICY follow_requests_delete ON follow_requests
  FOR DELETE USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

-- FOLLOWS POLICIES
-- Anyone can view follows (public social graph)
CREATE POLICY follows_select ON follows
  FOR SELECT USING (true);

-- Users can create follows (as the follower)
CREATE POLICY follows_insert ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Users can delete their own follows (unfollow)
CREATE POLICY follows_delete ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- ============================================================================= 
-- 5. DATABASE TRIGGERS - Automatic notification creation
-- ============================================================================= 

-- Function to create notification when follow request is sent
CREATE OR REPLACE FUNCTION create_follow_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  requester_profile RECORD;
BEGIN
  -- Get requester's profile information
  SELECT full_name, username INTO requester_profile
  FROM profiles
  WHERE id = NEW.requester_id
  LIMIT 1;

  -- Create notification for the target user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    summary,
    related_user_id,
    priority,
    is_read
  ) VALUES (
    NEW.target_id,
    'follow_request',
    'New Follow Request',
    COALESCE(requester_profile.full_name, requester_profile.username, 'Someone') || ' wants to follow you',
    'New follow request',
    NEW.requester_id,
    'normal',
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follow request creation
DROP TRIGGER IF EXISTS trigger_follow_request_notification ON follow_requests;
CREATE TRIGGER trigger_follow_request_notification
  AFTER INSERT ON follow_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION create_follow_request_notification();

-- Function to create notification when follow request is accepted
CREATE OR REPLACE FUNCTION create_follow_acceptance_notification()
RETURNS TRIGGER AS $$
DECLARE
  target_profile RECORD;
BEGIN
  -- Only create notification if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get target user's profile information
    SELECT full_name, username INTO target_profile
    FROM profiles
    WHERE id = NEW.target_id
    LIMIT 1;

    -- Create notification for the requester
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      summary,
      related_user_id,
      priority,
      is_read
    ) VALUES (
      NEW.requester_id,
      'follow_accepted',
      'Follow Request Accepted',
      COALESCE(target_profile.full_name, target_profile.username, 'User') || ' accepted your follow request',
      'Follow request accepted',
      NEW.target_id,
      'normal',
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follow request acceptance
DROP TRIGGER IF EXISTS trigger_follow_acceptance_notification ON follow_requests;
CREATE TRIGGER trigger_follow_acceptance_notification
  AFTER UPDATE ON follow_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION create_follow_acceptance_notification();

-- ============================================================================= 
-- 6. HELPER FUNCTIONS - Auto-create follow relationship on accept
-- ============================================================================= 

-- Function to automatically create follow relationship when request is accepted
CREATE OR REPLACE FUNCTION handle_follow_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- Update follower counts in profiles if columns exist
    BEGIN
      UPDATE profiles 
      SET followers_count = COALESCE(followers_count, 0) + 1
      WHERE id = NEW.target_id;
      
      UPDATE profiles 
      SET following_count = COALESCE(following_count, 0) + 1
      WHERE id = NEW.requester_id;
    EXCEPTION
      WHEN undefined_column THEN
        -- Columns don't exist, skip update
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follow relationship creation
DROP TRIGGER IF EXISTS trigger_follow_request_accepted ON follow_requests;
CREATE TRIGGER trigger_follow_request_accepted
  AFTER UPDATE ON follow_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION handle_follow_request_accepted();

-- Function to update follower counts when follows are created/deleted
CREATE OR REPLACE FUNCTION update_follower_counts_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    BEGIN
      UPDATE profiles 
      SET followers_count = COALESCE(followers_count, 0) + 1
      WHERE id = NEW.following_id;
      
      UPDATE profiles 
      SET following_count = COALESCE(following_count, 0) + 1
      WHERE id = NEW.follower_id;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    BEGIN
      UPDATE profiles 
      SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
      WHERE id = OLD.following_id;
      
      UPDATE profiles 
      SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
      WHERE id = OLD.follower_id;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follower count updates
DROP TRIGGER IF EXISTS trigger_follows_count_update ON follows;
CREATE TRIGGER trigger_follows_count_update
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts_on_follow();

-- Function to update follow_requests updated_at timestamp
CREATE OR REPLACE FUNCTION update_follow_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow_requests updated_at
DROP TRIGGER IF EXISTS trigger_follow_requests_updated_at ON follow_requests;
CREATE TRIGGER trigger_follow_requests_updated_at
  BEFORE UPDATE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_requests_updated_at();

-- ============================================================================= 
-- 7. GRANT PERMISSIONS
-- ============================================================================= 

-- Grant necessary permissions to authenticated users
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT, UPDATE ON notifications TO authenticated;

GRANT ALL ON follow_requests TO authenticated;
GRANT ALL ON follows TO authenticated;

-- ============================================================================= 
-- MIGRATION COMPLETE
-- ============================================================================= 

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Complete follow/friend request system migration finished successfully';
  RAISE NOTICE '✅ Notifications table updated with all required columns';
  RAISE NOTICE '✅ Follow_requests table created with proper constraints';
  RAISE NOTICE '✅ Follows table verified';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Database triggers installed with SECURITY DEFINER';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Test the system using test-friend-request-flow.js';
  RAISE NOTICE '   2. Verify notification bell displays follow requests';
  RAISE NOTICE '   3. Test accepting/rejecting follow requests';
END $$;

