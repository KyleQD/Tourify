-- Apply Workflow System Only
-- This script creates the workflow system tables without policy conflicts
-- Run this directly in your Supabase SQL editor

-- Create onboarding_workflows table
CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES staff_onboarding_candidates(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES staff_jobs(id) ON DELETE SET NULL,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'invitation',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_completion TIMESTAMP,
  actual_completion TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP,
  sent_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
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

-- Add workflow_id to staff_onboarding_candidates for easier lookup
ALTER TABLE staff_onboarding_candidates 
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES onboarding_workflows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_onboarding_candidates_workflow_id ON staff_onboarding_candidates(workflow_id);

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

-- Create function to automatically create workflow when candidate is added
CREATE OR REPLACE FUNCTION create_workflow_for_candidate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create workflow if one doesn't already exist
  IF NEW.workflow_id IS NULL THEN
    INSERT INTO onboarding_workflows (
      venue_id,
      candidate_id,
      current_stage,
      status,
      steps,
      created_by
    ) VALUES (
      NEW.venue_id,
      NEW.id,
      'invitation',
      'active',
      '[
        {"id": "invitation", "stage": "invitation", "status": "active", "started_at": "' || NOW() || '"},
        {"id": "onboarding", "stage": "onboarding", "status": "paused"},
        {"id": "review", "stage": "review", "status": "paused"},
        {"id": "approved", "stage": "approved", "status": "paused"},
        {"id": "team_assigned", "stage": "team_assigned", "status": "paused"}
      ]'::jsonb,
      auth.uid()
    ) RETURNING id INTO NEW.workflow_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create workflow
CREATE TRIGGER create_workflow_trigger
  BEFORE INSERT ON staff_onboarding_candidates
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_for_candidate();

-- Create function to send notification when workflow stage changes
CREATE OR REPLACE FUNCTION notify_workflow_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  candidate_data RECORD;
  venue_data RECORD;
  user_id_val UUID;
BEGIN
  -- Get candidate and venue information
  SELECT name, email, position, department INTO candidate_data
  FROM staff_onboarding_candidates
  WHERE id = NEW.candidate_id;
  
  SELECT name INTO venue_data
  FROM venue_profiles
  WHERE id = NEW.venue_id;
  
  -- Get user_id from profiles table using email
  SELECT id INTO user_id_val
  FROM profiles
  WHERE email = candidate_data.email;
  
  -- Send notification based on stage change
  IF NEW.current_stage != OLD.current_stage THEN
    CASE NEW.current_stage
      WHEN 'onboarding_started' THEN
        INSERT INTO notifications (
          venue_id,
          user_id,
          type,
          title,
          message,
          priority,
          channels
        ) VALUES (
          NEW.venue_id,
          user_id_val,
          'onboarding_started',
          'Onboarding Started',
          'Your onboarding process has begun. Please complete all required forms.',
          'high',
          ARRAY['email', 'in_app']
        );
      
      WHEN 'onboarding_completed' THEN
        INSERT INTO notifications (
          venue_id,
          user_id,
          type,
          title,
          message,
          priority,
          channels
        ) VALUES (
          NEW.venue_id,
          user_id_val,
          'onboarding_completed',
          'Onboarding Completed',
          'Your onboarding has been completed and is ready for review.',
          'high',
          ARRAY['email', 'in_app']
        );
      
      WHEN 'approved' THEN
        INSERT INTO notifications (
          venue_id,
          user_id,
          type,
          title,
          message,
          priority,
          channels
        ) VALUES (
          NEW.venue_id,
          user_id_val,
          'approval_notification',
          'Onboarding Approved',
          'Congratulations! Your onboarding has been approved. Welcome to the team!',
          'high',
          ARRAY['email', 'sms', 'in_app']
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for workflow stage change notifications
CREATE TRIGGER workflow_stage_change_notification
  AFTER UPDATE ON onboarding_workflows
  FOR EACH ROW
  EXECUTE FUNCTION notify_workflow_stage_change();

-- Add comments for documentation
COMMENT ON TABLE onboarding_workflows IS 'Tracks the complete onboarding workflow for each candidate';
COMMENT ON TABLE notifications IS 'Stores all notifications for users and venues';
COMMENT ON COLUMN onboarding_workflows.steps IS 'JSON array of workflow steps with status and metadata';
COMMENT ON COLUMN onboarding_workflows.current_stage IS 'Current stage in the workflow process';
COMMENT ON COLUMN notifications.channels IS 'Array of notification channels (email, sms, push, in_app)';

-- Success message
SELECT 'Workflow system tables created successfully!' as status; 