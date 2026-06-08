-- Direct fix for notifications schema mismatch
-- Run this directly in Supabase SQL editor

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
