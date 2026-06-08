-- Apply Workflow System Migration
-- This script applies only the workflow system tables and functions

-- =============================================================================
-- WORKFLOW SYSTEM TABLES
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ONBOARDING WORKFLOWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES staff_onboarding_candidates(id) ON DELETE CASCADE,
    job_posting_id UUID REFERENCES staff_jobs(id) ON DELETE SET NULL,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'invited',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    steps JSONB NOT NULL DEFAULT '[]',
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    channels TEXT[] DEFAULT ARRAY['in_app'],
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_venue_id ON onboarding_workflows(venue_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_candidate_id ON onboarding_workflows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_status ON onboarding_workflows(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_current_stage ON onboarding_workflows(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_created_at ON onboarding_workflows(created_at DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_venue_id ON notifications(venue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - ONBOARDING WORKFLOWS
-- =============================================================================

-- Users can view workflows for venues they are members of
CREATE POLICY "Users can view venue workflows" ON onboarding_workflows
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM venue_members 
            WHERE venue_members.venue_id = onboarding_workflows.venue_id 
            AND venue_members.user_id = auth.uid()
        )
    );

-- Users can create workflows for venues they are members of
CREATE POLICY "Users can create venue workflows" ON onboarding_workflows
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM venue_members 
            WHERE venue_members.venue_id = onboarding_workflows.venue_id 
            AND venue_members.user_id = auth.uid()
        )
    );

-- Users can update workflows for venues they are members of
CREATE POLICY "Users can update venue workflows" ON onboarding_workflows
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM venue_members 
            WHERE venue_members.venue_id = onboarding_workflows.venue_id 
            AND venue_members.user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - NOTIFICATIONS
-- =============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create notifications for venues they are members of
CREATE POLICY "Users can create venue notifications" ON notifications
    FOR INSERT WITH CHECK (
        venue_id IS NULL OR EXISTS (
            SELECT 1 FROM venue_members 
            WHERE venue_members.venue_id = notifications.venue_id 
            AND venue_members.user_id = auth.uid()
        )
    );

-- Users can update their own notifications
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create workflow for new candidate
CREATE OR REPLACE FUNCTION create_workflow_for_candidate()
RETURNS TRIGGER AS $$
DECLARE
    workflow_id UUID;
    estimated_completion TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set estimated completion to 30 days from now
    estimated_completion := NOW() + INTERVAL '30 days';
    
    -- Create workflow
    INSERT INTO onboarding_workflows (
        venue_id,
        candidate_id,
        current_stage,
        status,
        steps,
        estimated_completion,
        created_by
    ) VALUES (
        NEW.venue_id,
        NEW.id,
        'invited',
        'active',
        '[]'::jsonb,
        estimated_completion,
        NEW.created_by
    ) RETURNING id INTO workflow_id;
    
    -- Update candidate with workflow_id
    UPDATE staff_onboarding_candidates 
    SET workflow_id = workflow_id 
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify workflow stage change
CREATE OR REPLACE FUNCTION notify_workflow_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if stage has changed
    IF OLD.current_stage != NEW.current_stage THEN
        -- Create notification for the candidate
        INSERT INTO notifications (
            venue_id,
            user_id,
            type,
            title,
            message,
            priority,
            channels,
            created_by
        ) VALUES (
            NEW.venue_id,
            (SELECT user_id FROM staff_onboarding_candidates WHERE id = NEW.candidate_id),
            'workflow_update',
            'Workflow Stage Updated',
            'Your onboarding process has moved to the ' || NEW.current_stage || ' stage.',
            'normal',
            ARRAY['in_app', 'email'],
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_onboarding_workflows_updated_at
    BEFORE UPDATE ON onboarding_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create workflow for new candidate
CREATE TRIGGER create_workflow_for_candidate
    AFTER INSERT ON staff_onboarding_candidates
    FOR EACH ROW
    EXECUTE FUNCTION create_workflow_for_candidate();

-- Trigger to notify workflow stage change
CREATE TRIGGER notify_workflow_stage_change
    AFTER UPDATE ON onboarding_workflows
    FOR EACH ROW
    EXECUTE FUNCTION notify_workflow_stage_change();

-- =============================================================================
-- ADD WORKFLOW_ID COLUMN TO STAFF_ONBOARDING_CANDIDATES
-- =============================================================================

-- Add workflow_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_onboarding_candidates' 
        AND column_name = 'workflow_id'
    ) THEN
        ALTER TABLE staff_onboarding_candidates ADD COLUMN workflow_id UUID REFERENCES onboarding_workflows(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions on onboarding_workflows
GRANT SELECT, INSERT, UPDATE ON onboarding_workflows TO authenticated;
GRANT USAGE ON SEQUENCE onboarding_workflows_id_seq TO authenticated;

-- Grant permissions on notifications
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;

-- Grant execution permission on functions
GRANT EXECUTE ON FUNCTION create_workflow_for_candidate() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_workflow_stage_change() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE onboarding_workflows IS 'Tracks the workflow progression for onboarding candidates';
COMMENT ON TABLE notifications IS 'Stores notifications for users across different channels';
COMMENT ON FUNCTION create_workflow_for_candidate() IS 'Automatically creates a workflow when a new candidate is added';
COMMENT ON FUNCTION notify_workflow_stage_change() IS 'Sends notifications when workflow stages change'; 