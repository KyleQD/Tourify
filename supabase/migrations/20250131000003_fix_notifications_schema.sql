set client_min_messages = warning;

-- Fix notifications table schema mismatch
-- This migration adds missing columns that the application code expects

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_content_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_content_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update existing records to have proper default values
UPDATE notifications 
SET is_read = (read_at IS NOT NULL)
WHERE is_read IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_user_id ON notifications(related_user_id);

-- Ensure follow_requests table exists with proper structure
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- Add RLS policies for follow_requests
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS follow_requests_select ON follow_requests;
DROP POLICY IF EXISTS follow_requests_insert ON follow_requests;
DROP POLICY IF EXISTS follow_requests_update ON follow_requests;

-- Create RLS policies for follow_requests
CREATE POLICY follow_requests_select ON follow_requests
  FOR SELECT USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

CREATE POLICY follow_requests_insert ON follow_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
  );

CREATE POLICY follow_requests_update ON follow_requests
  FOR UPDATE USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  ) WITH CHECK (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

-- Create indexes for follow_requests
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_id ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Notification type preferences
  enable_likes BOOLEAN DEFAULT TRUE,
  enable_comments BOOLEAN DEFAULT TRUE,
  enable_follows BOOLEAN DEFAULT TRUE,
  enable_messages BOOLEAN DEFAULT TRUE,
  enable_events BOOLEAN DEFAULT TRUE,
  enable_bookings BOOLEAN DEFAULT TRUE,
  enable_system BOOLEAN DEFAULT TRUE,
  
  -- Delivery preferences
  enable_in_app BOOLEAN DEFAULT TRUE,
  enable_email BOOLEAN DEFAULT FALSE,
  enable_push BOOLEAN DEFAULT FALSE,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_own ON notification_preferences;
CREATE POLICY notification_preferences_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Create function to handle follow request notifications
CREATE OR REPLACE FUNCTION create_follow_request_notification()
RETURNS TRIGGER AS $$
BEGIN
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
    'You have received a new follow request',
    'New follow request received',
    NEW.requester_id,
    'normal',
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follow request notifications
DROP TRIGGER IF EXISTS trigger_follow_request_notification ON follow_requests;
CREATE TRIGGER trigger_follow_request_notification
  AFTER INSERT ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_request_notification();

-- Create function to handle follow request acceptance notifications
CREATE OR REPLACE FUNCTION create_follow_acceptance_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
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
      'Your follow request has been accepted',
      'Follow request accepted',
      NEW.target_id,
      'normal',
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follow request acceptance notifications
DROP TRIGGER IF EXISTS trigger_follow_acceptance_notification ON follow_requests;
CREATE TRIGGER trigger_follow_acceptance_notification
  AFTER UPDATE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_acceptance_notification();
