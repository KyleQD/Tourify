-- Safe fix for notifications system - handles existing constraints
-- This version checks for existing constraints before creating new ones

-- First, check what constraint exists on the notifications.type field
-- and remove it so we can add the proper one

-- Remove existing check constraints if they exist
DO $$ 
BEGIN
    -- Try to drop the type constraint (it might not exist)
    BEGIN
        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    EXCEPTION
        WHEN undefined_object THEN
            -- Constraint doesn't exist, that's fine
            NULL;
    END;
    
    -- Try to drop the priority constraint (it might not exist)
    BEGIN
        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
    EXCEPTION
        WHEN undefined_object THEN
            -- Constraint doesn't exist, that's fine
            NULL;
    END;
END $$;

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_content_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_content_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update existing records to have proper default values
UPDATE notifications 
SET is_read = (read_at IS NOT NULL)
WHERE is_read IS NULL;

-- Create comprehensive check constraint for notification types (only if it doesn't exist)
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_type_check' 
        AND conrelid = 'notifications'::regclass
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
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

-- Create comprehensive check constraint for priority (only if it doesn't exist)
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_priority_check' 
        AND conrelid = 'notifications'::regclass
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

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
