-- Admin Onboarding System Migration
-- This creates the admin onboarding tables and structure

-- Create admin_onboarding table
CREATE TABLE IF NOT EXISTS admin_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role VARCHAR(50) NOT NULL,
  onboarding_status VARCHAR(20) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 7,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  onboarding_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_roles table for role definitions
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_onboarding_steps table for step definitions
CREATE TABLE IF NOT EXISTS admin_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  component_name VARCHAR(100),
  is_required BOOLEAN DEFAULT true,
  estimated_time INTEGER DEFAULT 5, -- in minutes
  prerequisites JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_onboarding_user_id ON admin_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_onboarding_status ON admin_onboarding(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_admin_onboarding_role ON admin_onboarding(admin_role);
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);
CREATE INDEX IF NOT EXISTS idx_admin_onboarding_steps_number ON admin_onboarding_steps(step_number);

-- Insert default admin roles (using DO block to handle conflicts)
DO $$
BEGIN
  -- Insert admin roles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'tour_manager') THEN
    INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
    ('tour_manager', 'Tour Manager', 'Full tour management capabilities including planning, logistics, and execution', 
      '["tours.create", "tours.edit", "tours.delete", "events.create", "events.edit", "events.delete", "team.manage", "budget.view", "analytics.view"]');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'event_coordinator') THEN
    INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
    ('event_coordinator', 'Event Coordinator', 'Event creation and management with focus on individual events and shows',
      '["events.create", "events.edit", "events.delete", "venue.coordinate", "logistics.manage", "budget.view"]');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'financial_manager') THEN
    INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
    ('financial_manager', 'Financial Manager', 'Budget tracking, expense management, and financial reporting',
      '["budget.manage", "expenses.track", "revenue.view", "reports.generate", "analytics.view"]');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'team_manager') THEN
    INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
    ('team_manager', 'Team Manager', 'Staff and crew management, scheduling, and team coordination',
      '["team.manage", "crew.schedule", "roles.assign", "performance.track"]');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'analytics_admin') THEN
    INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
    ('analytics_admin', 'Analytics Admin', 'Reports, performance tracking, and data analysis',
      '["analytics.view", "reports.generate", "data.export", "metrics.track"]');
  END IF;
END $$;

-- Insert default onboarding steps (using DO block to handle conflicts)
DO $$
BEGIN
  -- Insert onboarding steps if they don't exist
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 1) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (1, 'Welcome & Role Selection', 'Choose your admin role and understand your responsibilities', 'RoleSelection', 3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 2) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (2, 'Platform Overview', 'Interactive tour of the dashboard and key features', 'PlatformOverview', 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 3) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (3, 'Create Your First Tour', 'Guided process to create your first tour with sample data', 'FirstTourCreation', 8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 4) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (4, 'Event Management', 'Learn to create and manage events within tours', 'EventManagement', 6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 5) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (5, 'Team Setup', 'Add team members and assign roles and permissions', 'TeamSetup', 7);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 6) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (6, 'Analytics & Reporting', 'Understand dashboard metrics and reporting features', 'AnalyticsTraining', 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM admin_onboarding_steps WHERE step_number = 7) THEN
    INSERT INTO admin_onboarding_steps (step_number, title, description, component_name, estimated_time) VALUES
    (7, 'Completion & Certification', 'Final review and admin access activation', 'Completion', 3);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_onboarding_updated_at ON admin_onboarding;
CREATE TRIGGER update_admin_onboarding_updated_at
  BEFORE UPDATE ON admin_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_onboarding_steps_updated_at ON admin_onboarding_steps;
CREATE TRIGGER update_admin_onboarding_steps_updated_at
  BEFORE UPDATE ON admin_onboarding_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to start admin onboarding
CREATE OR REPLACE FUNCTION start_admin_onboarding(user_uuid UUID, role_name VARCHAR(50))
RETURNS UUID AS $$
DECLARE
  onboarding_id UUID;
BEGIN
  -- Check if user already has onboarding record
  SELECT id INTO onboarding_id
  FROM admin_onboarding
  WHERE user_id = user_uuid;
  
  IF onboarding_id IS NULL THEN
    -- Create new onboarding record
    INSERT INTO admin_onboarding (user_id, admin_role, onboarding_status, current_step, total_steps)
    VALUES (user_uuid, role_name, 'in_progress', 1, 7)
    RETURNING id INTO onboarding_id;
  ELSE
    -- Update existing record
    UPDATE admin_onboarding
    SET admin_role = role_name, onboarding_status = 'in_progress', current_step = 1, started_at = NOW()
    WHERE id = onboarding_id;
  END IF;
  
  RETURN onboarding_id;
END;
$$ language 'plpgsql';

-- Create function to complete onboarding step
CREATE OR REPLACE FUNCTION complete_onboarding_step(onboarding_uuid UUID, step_number INTEGER, step_data JSONB DEFAULT '{}'::jsonb)
RETURNS BOOLEAN AS $$
DECLARE
  current_completed_steps JSONB;
  new_completed_steps JSONB;
BEGIN
  -- Get current completed steps
  SELECT completed_steps INTO current_completed_steps
  FROM admin_onboarding
  WHERE id = onboarding_uuid;
  
  -- Add new step to completed steps
  new_completed_steps = current_completed_steps || jsonb_build_array(step_number);
  
  -- Update onboarding record
  UPDATE admin_onboarding
  SET 
    completed_steps = new_completed_steps,
    current_step = step_number + 1,
    onboarding_data = onboarding_data || step_data,
    updated_at = NOW()
  WHERE id = onboarding_uuid;
  
  -- Check if all steps are completed
  IF jsonb_array_length(new_completed_steps) >= 7 THEN
    UPDATE admin_onboarding
    SET 
      onboarding_status = 'completed',
      completed_at = NOW()
    WHERE id = onboarding_uuid;
  END IF;
  
  RETURN true;
END;
$$ language 'plpgsql';

-- Add RLS policies
ALTER TABLE admin_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own onboarding" ON admin_onboarding;
DROP POLICY IF EXISTS "Users can update their own onboarding" ON admin_onboarding;
DROP POLICY IF EXISTS "Users can insert their own onboarding" ON admin_onboarding;
DROP POLICY IF EXISTS "Everyone can view admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Everyone can view onboarding steps" ON admin_onboarding_steps;

-- Users can view and edit their own onboarding data
CREATE POLICY "Users can view their own onboarding" ON admin_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding" ON admin_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding" ON admin_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Everyone can view roles and steps (they're public)
CREATE POLICY "Everyone can view admin roles" ON admin_roles
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view onboarding steps" ON admin_onboarding_steps
  FOR SELECT USING (true);

-- Success message
SELECT 'Admin onboarding system created successfully!' as status; 