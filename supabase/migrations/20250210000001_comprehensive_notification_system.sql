-- =============================================================================
-- COMPREHENSIVE NOTIFICATION SYSTEM MIGRATION
-- This migration fixes all notification system issues and implements scalability
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. UNIFIED NOTIFICATIONS SCHEMA
-- =============================================================================

-- Add missing columns to notifications table
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

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Migrate existing data: set is_read based on read_at if is_read was just added
UPDATE notifications 
SET is_read = (read_at IS NOT NULL)
WHERE is_read IS NULL;

-- Add check constraints
DO $$
BEGIN
  -- Priority constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'notifications_priority_check'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  -- Type constraint (comprehensive)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
      -- Social interactions
      'like', 'comment', 'share', 'follow', 'follow_request', 'follow_accepted', 'unfollow', 'mention', 'tag',
      -- Messages
      'message', 'message_request', 'group_message',
      -- Events & Bookings
      'event_invite', 'event_reminder', 'booking_request', 'booking_accepted', 'booking_declined',
      -- Content & Activity
      'post_created', 'content_approved', 'content_rejected', 'achievement_unlocked',
      -- System & Admin
      'system_alert', 'maintenance', 'feature_update', 'security_alert',
      -- Business & Professional
      'job_application', 'job_offer', 'collaboration_request', 'partnership_invite',
      -- Venue & Artist specific
      'venue_booking', 'artist_booking', 'performance_reminder', 'soundcheck_reminder',
      -- Payment & Financial
      'payment_received', 'payment_failed', 'refund_processed', 'subscription_renewal',
      -- Test and general
      'test', 'general', 'announcement'
    ));
  END IF;
END $$;

-- =============================================================================
-- 2. SOCIAL INTERACTION TABLES
-- =============================================================================

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  CHECK (post_id IS NOT NULL AND user_id IS NOT NULL)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (post_id IS NOT NULL AND user_id IS NOT NULL AND content IS NOT NULL)
);

-- Create post_shares table
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to TEXT, -- 'feed', 'story', 'message', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, shared_to),
  CHECK (post_id IS NOT NULL AND user_id IS NOT NULL)
);

-- =============================================================================
-- 3. PERFORMANCE INDEXES
-- =============================================================================

-- Notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created_at 
  ON notifications(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_is_read 
  ON notifications(user_id, is_read);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created_at 
  ON notifications(type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_related_user_id 
  ON notifications(related_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_priority 
  ON notifications(priority);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_expires_at 
  ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Social interaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_post_id 
  ON post_likes(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_user_id 
  ON post_likes(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_created_at 
  ON post_likes(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_post_id 
  ON post_comments(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_user_id 
  ON post_comments(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_parent_id 
  ON post_comments(parent_comment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_shares_post_id 
  ON post_shares(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_shares_user_id 
  ON post_shares(user_id);

-- =============================================================================
-- 4. NOTIFICATION TRIGGERS
-- =============================================================================

-- Function to create like notification
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  liker_profile RECORD;
  post_content_preview TEXT;
BEGIN
  -- Get post author and content
  SELECT user_id, LEFT(content, 100) INTO post_author_id, post_content_preview 
  FROM posts WHERE id = NEW.post_id;
  
  -- Get liker profile information
  SELECT full_name, username INTO liker_profile 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if liking own post
  IF post_author_id != NEW.user_id THEN
    INSERT INTO notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read
    ) VALUES (
      post_author_id, 'like', 'New Like',
      COALESCE(liker_profile.full_name, liker_profile.username, 'Someone') || ' liked your post: "' || post_content_preview || '"',
      'New like received',
      NEW.user_id, NEW.post_id, 'post',
      'normal', FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create comment notification
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  commenter_profile RECORD;
  post_content_preview TEXT;
  comment_preview TEXT;
BEGIN
  -- Get post author and content
  SELECT user_id, LEFT(content, 100) INTO post_author_id, post_content_preview 
  FROM posts WHERE id = NEW.post_id;
  
  -- Get commenter profile information
  SELECT full_name, username INTO commenter_profile 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Create comment preview
  comment_preview := LEFT(NEW.content, 50);
  
  -- Don't notify if commenting on own post
  IF post_author_id != NEW.user_id THEN
    INSERT INTO notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata
    ) VALUES (
      post_author_id, 'comment', 'New Comment',
      COALESCE(commenter_profile.full_name, commenter_profile.username, 'Someone') || ' commented on your post: "' || comment_preview || '"',
      'New comment received',
      NEW.user_id, NEW.post_id, 'post',
      'normal', FALSE,
      jsonb_build_object(
        'post_content', post_content_preview,
        'comment_id', NEW.id,
        'comment_preview', comment_preview
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create share notification
CREATE OR REPLACE FUNCTION create_share_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  sharer_profile RECORD;
  post_content_preview TEXT;
BEGIN
  -- Get post author and content
  SELECT user_id, LEFT(content, 100) INTO post_author_id, post_content_preview 
  FROM posts WHERE id = NEW.post_id;
  
  -- Get sharer profile information
  SELECT full_name, username INTO sharer_profile 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if sharing own post
  IF post_author_id != NEW.user_id THEN
    INSERT INTO notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata
    ) VALUES (
      post_author_id, 'share', 'Post Shared',
      COALESCE(sharer_profile.full_name, sharer_profile.username, 'Someone') || ' shared your post: "' || post_content_preview || '"',
      'Post shared',
      NEW.user_id, NEW.post_id, 'post',
      'normal', FALSE,
      jsonb_build_object(
        'post_content', post_content_preview,
        'shared_to', COALESCE(NEW.shared_to, 'feed')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post engagement counts
CREATE OR REPLACE FUNCTION update_post_engagement_counts()
RETURNS TRIGGER AS $$
DECLARE
  post_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    post_id_val := NEW.post_id;
    
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts SET like_count = COALESCE(like_count, 0) + 1 WHERE id = post_id_val;
    ELSIF TG_TABLE_NAME = 'post_comments' THEN
      UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = post_id_val;
    ELSIF TG_TABLE_NAME = 'post_shares' THEN
      UPDATE posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = post_id_val;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    post_id_val := OLD.post_id;
    
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = post_id_val;
    ELSIF TG_TABLE_NAME = 'post_comments' THEN
      UPDATE posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = post_id_val;
    ELSIF TG_TABLE_NAME = 'post_shares' THEN
      UPDATE posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = post_id_val;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. CREATE TRIGGERS
-- =============================================================================

-- Like notification trigger
DROP TRIGGER IF EXISTS trigger_post_like_notification ON post_likes;
CREATE TRIGGER trigger_post_like_notification
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- Comment notification trigger
DROP TRIGGER IF EXISTS trigger_post_comment_notification ON post_comments;
CREATE TRIGGER trigger_post_comment_notification
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Share notification trigger
DROP TRIGGER IF EXISTS trigger_post_share_notification ON post_shares;
CREATE TRIGGER trigger_post_share_notification
  AFTER INSERT ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION create_share_notification();

-- Engagement count update triggers
DROP TRIGGER IF EXISTS trigger_post_like_count_update ON post_likes;
CREATE TRIGGER trigger_post_like_count_update
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_engagement_counts();

DROP TRIGGER IF EXISTS trigger_post_comment_count_update ON post_comments;
CREATE TRIGGER trigger_post_comment_count_update
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_engagement_counts();

DROP TRIGGER IF EXISTS trigger_post_share_count_update ON post_shares;
CREATE TRIGGER trigger_post_share_count_update
  AFTER INSERT OR DELETE ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_post_engagement_counts();

-- Notification updated_at trigger
DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================

-- Enable RLS on social interaction tables
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;

-- Notifications policies
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Post likes policies
CREATE POLICY post_likes_select ON post_likes
  FOR SELECT USING (true);

CREATE POLICY post_likes_insert ON post_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_likes_delete ON post_likes
  FOR DELETE USING (user_id = auth.uid());

-- Post comments policies
CREATE POLICY post_comments_select ON post_comments
  FOR SELECT USING (true);

CREATE POLICY post_comments_insert ON post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_comments_update ON post_comments
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY post_comments_delete ON post_comments
  FOR DELETE USING (user_id = auth.uid());

-- Post shares policies
CREATE POLICY post_shares_select ON post_shares
  FOR SELECT USING (true);

CREATE POLICY post_shares_insert ON post_shares
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_shares_delete ON post_shares
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- 7. NOTIFICATION PREFERENCES SYSTEM
-- =============================================================================

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Global settings
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Type-specific preferences
  enable_likes BOOLEAN DEFAULT TRUE,
  enable_comments BOOLEAN DEFAULT TRUE,
  enable_shares BOOLEAN DEFAULT TRUE,
  enable_follows BOOLEAN DEFAULT TRUE,
  enable_messages BOOLEAN DEFAULT TRUE,
  enable_events BOOLEAN DEFAULT TRUE,
  enable_system BOOLEAN DEFAULT TRUE,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  -- Advanced preferences
  preferences JSONB DEFAULT '{}',
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('never', 'hourly', 'daily', 'weekly')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_own ON notification_preferences;
CREATE POLICY notification_preferences_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =============================================================================
-- 8. UTILITY FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for creating default preferences
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON auth.users;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to check if user should receive notification based on preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs RECORD;
  current_time TIME;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- If no preferences, use defaults (send notification)
  IF prefs IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if in-app notifications are enabled
  IF NOT prefs.in_app_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check type-specific preferences
  CASE p_notification_type
    WHEN 'like' THEN
      IF NOT prefs.enable_likes THEN RETURN FALSE; END IF;
    WHEN 'comment' THEN
      IF NOT prefs.enable_comments THEN RETURN FALSE; END IF;
    WHEN 'share' THEN
      IF NOT prefs.enable_shares THEN RETURN FALSE; END IF;
    WHEN 'follow', 'follow_request', 'follow_accepted' THEN
      IF NOT prefs.enable_follows THEN RETURN FALSE; END IF;
    WHEN 'message', 'message_request', 'group_message' THEN
      IF NOT prefs.enable_messages THEN RETURN FALSE; END IF;
    WHEN 'event_invite', 'booking_request' THEN
      IF NOT prefs.enable_events THEN RETURN FALSE; END IF;
    WHEN 'system_alert', 'maintenance', 'feature_update' THEN
      IF NOT prefs.enable_system THEN RETURN FALSE; END IF;
    ELSE
      -- For unknown types, allow notification
      NULL;
  END CASE;
  
  -- Check quiet hours (only for normal priority notifications)
  IF prefs.quiet_hours_enabled AND p_priority = 'normal' THEN
    current_time := CURRENT_TIME;
    
    -- Handle overnight quiet hours (e.g., 22:00 to 08:00)
    IF prefs.quiet_hours_start > prefs.quiet_hours_end THEN
      IF current_time >= prefs.quiet_hours_start OR current_time <= prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    ELSE
      -- Handle same-day quiet hours (e.g., 22:00 to 23:00)
      IF current_time >= prefs.quiet_hours_start AND current_time <= prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON notifications TO authenticated;

GRANT ALL ON post_likes TO authenticated;
GRANT ALL ON post_comments TO authenticated;
GRANT ALL ON post_shares TO authenticated;

GRANT ALL ON notification_preferences TO authenticated;

-- =============================================================================
-- 10. CLEANUP AND OPTIMIZATION
-- =============================================================================

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications 
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete unread notifications older than 90 days
  DELETE FROM notifications 
  WHERE is_read = FALSE 
    AND created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive notification system migration completed successfully';
  RAISE NOTICE '✅ Notifications table updated with all required columns';
  RAISE NOTICE '✅ Social interaction tables created (post_likes, post_comments, post_shares)';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ Automatic notification triggers installed';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Notification preferences system implemented';
  RAISE NOTICE '✅ Utility functions created';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Test social interactions (like, comment, share)';
  RAISE NOTICE '   2. Verify notifications are created automatically';
  RAISE NOTICE '   3. Check notification bell displays new notifications';
  RAISE NOTICE '   4. Test notification preferences';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 System is now ready for scalable notification delivery!';
END $$;
