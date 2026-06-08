-- Fix onboarding schema issues
-- Add missing employment_type column to staff_onboarding_templates
ALTER TABLE staff_onboarding_templates 
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time' 
CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'volunteer', 'intern'));

-- Add missing required_fields column to staff_onboarding_templates
ALTER TABLE staff_onboarding_templates 
ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '[]'::jsonb;

-- Add foreign key constraint for template_id in staff_onboarding_candidates
-- First drop the constraint if it exists, then add it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_onboarding_candidates_template' 
        AND table_name = 'staff_onboarding_candidates'
    ) THEN
        ALTER TABLE staff_onboarding_candidates DROP CONSTRAINT fk_onboarding_candidates_template;
    END IF;
END $$;

ALTER TABLE staff_onboarding_candidates 
ADD CONSTRAINT fk_onboarding_candidates_template 
FOREIGN KEY (template_id) REFERENCES staff_onboarding_templates(id) ON DELETE SET NULL;

-- Add missing columns to staff_onboarding_candidates for enhanced functionality
ALTER TABLE staff_onboarding_candidates 
ADD COLUMN IF NOT EXISTS invitation_token TEXT,
ADD COLUMN IF NOT EXISTS onboarding_responses JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update status check constraint to include 'approved'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'staff_onboarding_candidates_status_check'
    ) THEN
        ALTER TABLE staff_onboarding_candidates DROP CONSTRAINT staff_onboarding_candidates_status_check;
    END IF;
END $$;

ALTER TABLE staff_onboarding_candidates 
ADD CONSTRAINT staff_onboarding_candidates_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'approved'));

-- Update stage check constraint to include new stages
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'staff_onboarding_candidates_stage_check'
    ) THEN
        ALTER TABLE staff_onboarding_candidates DROP CONSTRAINT staff_onboarding_candidates_stage_check;
    END IF;
END $$;

ALTER TABLE staff_onboarding_candidates 
ADD CONSTRAINT staff_onboarding_candidates_stage_check 
CHECK (stage IN ('invitation', 'onboarding', 'review', 'approved', 'rejected'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_template_id ON staff_onboarding_candidates(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_invitation_token ON staff_onboarding_candidates(invitation_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_employment_type ON staff_onboarding_templates(employment_type); 