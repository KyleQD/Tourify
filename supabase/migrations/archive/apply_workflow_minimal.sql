-- Minimal Workflow System Migration
-- This creates only the essential workflow tables without any dependencies
-- Run this directly in your Supabase SQL editor

-- Create onboarding_workflows table (minimal version)
CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  job_posting_id UUID,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'invitation',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_completion TIMESTAMP,
  actual_completion TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table (minimal version)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  user_id UUID,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP,
  sent_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_venue_id ON onboarding_workflows(venue_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_candidate_id ON onboarding_workflows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_status ON onboarding_workflows(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_current_stage ON onboarding_workflows(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_created_at ON onboarding_workflows(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_venue_id ON notifications(venue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_onboarding_workflows_updated_at
  BEFORE UPDATE ON onboarding_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE onboarding_workflows IS 'Tracks the complete onboarding workflow for each candidate';
COMMENT ON TABLE notifications IS 'Stores all notifications for users and venues';
COMMENT ON COLUMN onboarding_workflows.steps IS 'JSON array of workflow steps with status and metadata';
COMMENT ON COLUMN onboarding_workflows.current_stage IS 'Current stage in the workflow process';
COMMENT ON COLUMN notifications.channels IS 'Array of notification channels (email, sms, push, in_app)';

-- Success message
SELECT 'Minimal workflow system tables created successfully!' as status; 