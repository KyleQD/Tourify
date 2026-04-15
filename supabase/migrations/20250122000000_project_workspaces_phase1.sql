set client_min_messages = warning;

-- =============================================================================
-- PROJECT WORKSPACES - PHASE 1 IMPLEMENTATION
-- Builds on existing infrastructure for collaboration projects
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- MAIN PROJECT WORKSPACE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS collaboration_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('album', 'single', 'ep', 'collaboration', 'live_show', 'tour')),
  genre TEXT[] DEFAULT '{}',
  
  -- Ownership (uses existing auth system)
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Status & Timeline
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'recording', 'mixing', 'mastering', 'completed')),
  start_date DATE,
  target_completion DATE,
  
  -- Settings
  privacy TEXT DEFAULT 'collaborators_only' CHECK (privacy IN ('private', 'collaborators_only', 'public')),
  
  -- Integration with existing communication system
  communication_channel_id UUID REFERENCES communication_channels(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PROJECT COLLABORATORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES collaboration_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Role & Permissions
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'collaborator', 'viewer')),
  specific_role TEXT, -- 'songwriter', 'producer', 'vocalist', 'instrumentalist', 'engineer'
  permissions JSONB DEFAULT '{
    "can_edit": true,
    "can_invite": false,
    "can_manage_files": true,
    "can_post_in_channel": true
  }'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive')),
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  
  UNIQUE(project_id, user_id)
);

-- =============================================================================
-- PROJECT FILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES collaboration_projects(id) ON DELETE CASCADE NOT NULL,
  
  -- File Info (integrates with existing storage system)
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in existing storage bucket
  file_type TEXT NOT NULL CHECK (file_type IN ('demo', 'stem', 'master', 'reference', 'document')),
  mime_type TEXT,
  file_size INTEGER,
  
  -- Project Context
  track_name TEXT,
  version_number INTEGER DEFAULT 1,
  description TEXT,
  
  -- Organization
  folder TEXT DEFAULT 'general', -- 'demos', 'stems', 'masters', 'references'
  tags TEXT[] DEFAULT '{}',
  
  -- Attribution
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PROJECT TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES collaboration_projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('songwriting', 'recording', 'mixing', 'feedback', 'general')),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Status & Priority
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Timeline
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Integration
  related_file_id UUID REFERENCES project_files(id),
  discussion_message_id UUID, -- Links to existing message system
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PROJECT ACTIVITY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES collaboration_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity Details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'project_created', 'project_updated', 'collaborator_invited', 'collaborator_joined',
    'file_uploaded', 'file_updated', 'task_created', 'task_completed', 'comment_added'
  )),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COLLABORATION INVITATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS collaboration_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation Details
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES collaboration_projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Message
  invitation_message TEXT,
  proposed_role TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  
  -- Response
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  
  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AUDIO FILES METADATA TABLE (Phase 2 preparation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_file_id UUID REFERENCES project_files(id) ON DELETE CASCADE NOT NULL,
  
  -- Audio Metadata
  duration_seconds DECIMAL(8,2),
  bpm INTEGER,
  key TEXT,
  bitrate INTEGER,
  sample_rate INTEGER,
  
  -- Collaboration Features
  waveform_data JSONB, -- For visual timeline
  markers JSONB DEFAULT '[]'::jsonb, -- Timestamp markers
  
  -- Processing Status
  analysis_completed BOOLEAN DEFAULT false,
  waveform_generated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_projects_owner ON collaboration_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_projects_status ON collaboration_projects(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_projects_type ON collaboration_projects(type);
CREATE INDEX IF NOT EXISTS idx_collaboration_projects_created ON collaboration_projects(created_at DESC);

-- Collaborator indexes
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_status ON project_collaborators(status);

-- File indexes
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_type ON project_files(file_type);
CREATE INDEX IF NOT EXISTS idx_project_files_uploader ON project_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_files_created ON project_files(created_at DESC);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due ON project_tasks(due_date);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_user ON project_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created ON project_activity(created_at DESC);

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_to_user ON collaboration_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_project ON collaboration_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_status ON collaboration_invitations(status);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE collaboration_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COLLABORATION PROJECTS POLICIES
-- =============================================================================

-- Users can view projects they're collaborating on
CREATE POLICY "Users can view projects they collaborate on"
ON collaboration_projects FOR SELECT
USING (
  id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users can create their own projects
CREATE POLICY "Users can create projects"
ON collaboration_projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Project owners and admins can update projects
CREATE POLICY "Project owners and admins can update projects"
ON collaboration_projects FOR UPDATE
USING (
  id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role IN ('owner', 'admin')
  )
);

-- Project owners can delete projects
CREATE POLICY "Project owners can delete projects"
ON collaboration_projects FOR DELETE
USING (owner_id = auth.uid());

-- =============================================================================
-- PROJECT COLLABORATORS POLICIES
-- =============================================================================

-- Users can view collaborators of projects they're part of
CREATE POLICY "Users can view project collaborators"
ON project_collaborators FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users with invite permissions can add collaborators
CREATE POLICY "Users with permissions can add collaborators"
ON project_collaborators FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND (role IN ('owner', 'admin') OR (permissions->>'can_invite')::boolean = true)
  )
);

-- Users can update their own collaborator record
CREATE POLICY "Users can update their own collaborator record"
ON project_collaborators FOR UPDATE
USING (user_id = auth.uid());

-- =============================================================================
-- PROJECT FILES POLICIES
-- =============================================================================

-- Users can view files from projects they're part of
CREATE POLICY "Users can view project files"
ON project_files FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users with file permissions can upload files
CREATE POLICY "Users with permissions can upload files"
ON project_files FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() 
  AND project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND (permissions->>'can_manage_files')::boolean = true
  )
);

-- File uploaders and project admins can update files
CREATE POLICY "File uploaders and admins can update files"
ON project_files FOR UPDATE
USING (
  uploaded_by = auth.uid() 
  OR project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- PROJECT TASKS POLICIES
-- =============================================================================

-- Users can view tasks from projects they're part of
CREATE POLICY "Users can view project tasks"
ON project_tasks FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users with edit permissions can create tasks
CREATE POLICY "Users with permissions can create tasks"
ON project_tasks FOR INSERT
WITH CHECK (
  assigned_by = auth.uid() 
  AND project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND (permissions->>'can_edit')::boolean = true
  )
);

-- Task creators, assignees, and project admins can update tasks
CREATE POLICY "Authorized users can update tasks"
ON project_tasks FOR UPDATE
USING (
  assigned_by = auth.uid() 
  OR assigned_to = auth.uid()
  OR project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- PROJECT ACTIVITY POLICIES
-- =============================================================================

-- Users can view activity from projects they're part of
CREATE POLICY "Users can view project activity"
ON project_activity FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users can create their own activity records
CREATE POLICY "Users can create activity records"
ON project_activity FOR INSERT
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- COLLABORATION INVITATIONS POLICIES
-- =============================================================================

-- Users can view invitations sent to them
CREATE POLICY "Users can view their invitations"
ON collaboration_invitations FOR SELECT
USING (to_user_id = auth.uid());

-- Users can view invitations they sent
CREATE POLICY "Users can view sent invitations"
ON collaboration_invitations FOR SELECT
USING (from_user_id = auth.uid());

-- Users with permissions can send invitations
CREATE POLICY "Authorized users can send invitations"
ON collaboration_invitations FOR INSERT
WITH CHECK (
  from_user_id = auth.uid()
  AND project_id IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND (role IN ('owner', 'admin') OR (permissions->>'can_invite')::boolean = true)
  )
);

-- Users can update invitations sent to them
CREATE POLICY "Users can respond to invitations"
ON collaboration_invitations FOR UPDATE
USING (to_user_id = auth.uid());

-- =============================================================================
-- AUDIO FILES POLICIES
-- =============================================================================

-- Users can view audio metadata from projects they're part of
CREATE POLICY "Users can view audio metadata"
ON audio_files FOR SELECT
USING (
  project_file_id IN (
    SELECT id FROM project_files 
    WHERE project_id IN (
      SELECT project_id FROM project_collaborators 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
);

-- System can create audio metadata records
CREATE POLICY "System can create audio metadata"
ON audio_files FOR INSERT
WITH CHECK (true); -- This will be used by background processing

-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================

-- Create storage bucket for project files (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files', 
  'project-files', 
  false, 
  104857600, -- 100MB limit
  ARRAY['audio/*', 'video/*', 'image/*', 'application/pdf', 'text/*']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project files bucket
CREATE POLICY "Project collaborators can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' 
  AND split_part(name, '/', 2)::uuid IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Project collaborators can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND split_part(name, '/', 2)::uuid IN (
    SELECT project_id FROM project_collaborators 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    AND (permissions->>'can_manage_files')::boolean = true
  )
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user has project permission
CREATE OR REPLACE FUNCTION has_project_permission(
  project_uuid UUID,
  user_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  collaborator_record RECORD;
BEGIN
  SELECT role, permissions, status 
  INTO collaborator_record
  FROM project_collaborators 
  WHERE project_id = project_uuid 
  AND user_id = user_uuid;
  
  -- Check if user is not a collaborator
  IF NOT FOUND OR collaborator_record.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Owner and admin have all permissions
  IF collaborator_record.role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  RETURN (collaborator_record.permissions ->> permission_name)::boolean = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project stats
CREATE OR REPLACE FUNCTION get_project_stats(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'collaborators_count', (
      SELECT COUNT(*) FROM project_collaborators 
      WHERE project_id = project_uuid AND status = 'active'
    ),
    'files_count', (
      SELECT COUNT(*) FROM project_files 
      WHERE project_id = project_uuid
    ),
    'tasks_count', (
      SELECT COUNT(*) FROM project_tasks 
      WHERE project_id = project_uuid
    ),
    'completed_tasks_count', (
      SELECT COUNT(*) FROM project_tasks 
      WHERE project_id = project_uuid AND status = 'completed'
    ),
    'recent_activity_count', (
      SELECT COUNT(*) FROM project_activity 
      WHERE project_id = project_uuid 
      AND created_at > NOW() - INTERVAL '7 days'
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_project_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_stats(UUID) TO authenticated;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update project updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collaboration_projects 
  SET updated_at = NOW() 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_project_on_file_change
  AFTER INSERT OR UPDATE OR DELETE ON project_files
  FOR EACH ROW EXECUTE FUNCTION update_project_timestamp();

CREATE TRIGGER update_project_on_task_change
  AFTER INSERT OR UPDATE OR DELETE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_project_timestamp();

CREATE TRIGGER update_project_on_collaborator_change
  AFTER INSERT OR UPDATE OR DELETE ON project_collaborators
  FOR EACH ROW EXECUTE FUNCTION update_project_timestamp();

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Create default project categories (if using categories)
INSERT INTO artist_job_categories (name, description, icon, color) VALUES
('Music Collaboration', 'Musical collaboration projects', 'Users', '#8B5CF6'),
('Song Writing', 'Collaborative songwriting projects', 'Edit', '#10B981'),
('Recording Projects', 'Recording and production collaborations', 'Mic', '#F59E0B'),
('Live Performance', 'Live show and performance collaborations', 'Music', '#EF4444')
ON CONFLICT (name) DO NOTHING;