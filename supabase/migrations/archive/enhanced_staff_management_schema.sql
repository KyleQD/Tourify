-- Enhanced Staff Management Schema for Three-Tier System 
-- =============================================================================
-- This extends the existing venue_team_members table and adds new tables for
-- crew members and team contractors with job board integration
-- =============================================================================

-- Enhance existing venue_team_members table for Staff
-- =============================================================================
DO $$
BEGIN
  -- Add new columns to existing venue_team_members table for better staff management
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_team_members') THEN
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'volunteer'));
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '{}';
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE venue_team_members ADD COLUMN IF NOT EXISTS notes TEXT;
    
    RAISE NOTICE 'Enhanced venue_team_members table for staff management';
  END IF;
END $$;

-- Create Event Crew Members Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS venue_crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT NOT NULL, -- Sound Engineer, Lighting Tech, Stage Manager, etc.
  skills TEXT[] DEFAULT '{}', -- Array of specific skills
  certifications TEXT[] DEFAULT '{}', -- Professional certifications
  rate DECIMAL(10,2) NOT NULL,
  rate_type TEXT DEFAULT 'daily' CHECK (rate_type IN ('hourly', 'daily', 'project')),
  availability TEXT[] DEFAULT '{}', -- Available days/times
  rating DECIMAL(3,2) DEFAULT 0,
  events_completed INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  preferred_event_types TEXT[] DEFAULT '{}', -- concerts, festivals, corporate, etc.
  equipment TEXT[] DEFAULT '{}', -- Equipment they bring/own
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Team/Contractor Members Table  
-- =============================================================================
CREATE TABLE IF NOT EXISTS venue_team_contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL, -- Marketing Team, Street Team, etc.
  contract_type TEXT DEFAULT 'freelance' CHECK (contract_type IN ('freelance', 'contractor', 'agency')),
  specialization TEXT[] DEFAULT '{}', -- Street Marketing, Social Media, etc.
  rate DECIMAL(10,2) NOT NULL,
  rate_type TEXT DEFAULT 'project' CHECK (rate_type IN ('hourly', 'project', 'monthly')),
  active_contracts INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_project TEXT,
  portfolio_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Event Crew Assignments Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS event_crew_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  crew_member_id UUID REFERENCES venue_crew_members(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- Specific role for this event
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  rate_agreed DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, crew_member_id)
);

-- Create Team Project Assignments Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS team_project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  team_member_id UUID REFERENCES venue_team_contractors(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL, -- promotion, marketing, street_team, etc.
  start_date DATE NOT NULL,
  end_date DATE,
  rate_agreed DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  deliverables TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Job Board Integration
-- =============================================================================

-- Add venue integration to staff_jobs if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_jobs') THEN
    ALTER TABLE staff_jobs ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE;
    ALTER TABLE staff_jobs ADD COLUMN IF NOT EXISTS job_category TEXT DEFAULT 'staff' CHECK (job_category IN ('staff', 'crew', 'team'));
    ALTER TABLE staff_jobs ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    ALTER TABLE staff_jobs ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';
    ALTER TABLE staff_jobs ADD COLUMN IF NOT EXISTS certifications_required TEXT[] DEFAULT '{}';
    
    RAISE NOTICE 'Enhanced staff_jobs table for venue integration';
  END IF;
END $$;

-- Add hiring tracking to staff_applications if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_applications') THEN
    ALTER TABLE staff_applications ADD COLUMN IF NOT EXISTS hired_as TEXT; -- staff, crew, team
    ALTER TABLE staff_applications ADD COLUMN IF NOT EXISTS hired_date TIMESTAMPTZ;
    ALTER TABLE staff_applications ADD COLUMN IF NOT EXISTS final_rate DECIMAL(10,2);
    
    RAISE NOTICE 'Enhanced staff_applications table for hiring tracking';
  END IF;
END $$;

-- Create Staff Member Skills and Ratings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_member_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 5), -- 1-5 proficiency
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Create Staff Reviews/Ratings Table  
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL, -- performance, reliability, communication, etc.
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, staff_user_id, event_id, reviewer_id, category)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Crew members indexes
CREATE INDEX IF NOT EXISTS idx_venue_crew_members_venue_id ON venue_crew_members(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_crew_members_specialty ON venue_crew_members(specialty);
CREATE INDEX IF NOT EXISTS idx_venue_crew_members_availability ON venue_crew_members(is_available);

-- Team contractors indexes
CREATE INDEX IF NOT EXISTS idx_venue_team_contractors_venue_id ON venue_team_contractors(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_team_contractors_contract_type ON venue_team_contractors(contract_type);
CREATE INDEX IF NOT EXISTS idx_venue_team_contractors_active ON venue_team_contractors(is_active);

-- Event crew assignments indexes
CREATE INDEX IF NOT EXISTS idx_event_crew_assignments_event_id ON event_crew_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_crew_assignments_crew_member_id ON event_crew_assignments(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_event_crew_assignments_status ON event_crew_assignments(status);

-- Team project assignments indexes
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_venue_id ON team_project_assignments(venue_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_member_id ON team_project_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_status ON team_project_assignments(status);

-- Skills and reviews indexes
CREATE INDEX IF NOT EXISTS idx_staff_member_skills_user_id ON staff_member_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_reviews_venue_id ON staff_reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_staff_reviews_staff_user_id ON staff_reviews(staff_user_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE venue_crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_team_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_reviews ENABLE ROW LEVEL SECURITY;

-- Crew Members Policies
CREATE POLICY "Venue owners can manage their crew members"
  ON venue_crew_members FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Crew members can view and update their own profile"
  ON venue_crew_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view available crew members"
  ON venue_crew_members FOR SELECT
  USING (is_available = true);

-- Team Contractors Policies
CREATE POLICY "Venue owners can manage their team contractors"
  ON venue_team_contractors FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team contractors can view and update their own profile" 
  ON venue_team_contractors FOR SELECT
  USING (user_id = auth.uid());

-- Event Crew Assignments Policies
CREATE POLICY "Venue owners can manage event crew assignments"
  ON event_crew_assignments FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Crew members can view their assignments"
  ON event_crew_assignments FOR SELECT
  USING (
    crew_member_id IN (
      SELECT id FROM venue_crew_members WHERE user_id = auth.uid()
    )
  );

-- Team Project Assignments Policies
CREATE POLICY "Venue owners can manage team project assignments"
  ON team_project_assignments FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team contractors can view their assignments"
  ON team_project_assignments FOR SELECT
  USING (
    team_member_id IN (
      SELECT id FROM venue_team_contractors WHERE user_id = auth.uid()
    )
  );

-- Skills Policies
CREATE POLICY "Users can manage their own skills"
  ON staff_member_skills FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view verified skills"
  ON staff_member_skills FOR SELECT
  USING (verified = true);

-- Reviews Policies
CREATE POLICY "Venue owners can create reviews for their staff"
  ON staff_reviews FOR INSERT
  WITH CHECK (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view staff reviews"
  ON staff_reviews FOR SELECT
  USING (true);

-- =============================================================================
-- FUNCTIONS FOR STAFF MANAGEMENT
-- =============================================================================

-- Function to get staff dashboard stats
CREATE OR REPLACE FUNCTION get_staff_dashboard_stats(p_venue_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalStaff', COALESCE((
      SELECT COUNT(*) 
      FROM venue_team_members 
      WHERE venue_id = p_venue_id
    ), 0),
    'activeStaff', COALESCE((
      SELECT COUNT(*) 
      FROM venue_team_members 
      WHERE venue_id = p_venue_id AND status = 'active'
    ), 0),
    'totalCrew', COALESCE((
      SELECT COUNT(*) 
      FROM venue_crew_members 
      WHERE venue_id = p_venue_id
    ), 0),
    'availableCrew', COALESCE((
      SELECT COUNT(*) 
      FROM venue_crew_members 
      WHERE venue_id = p_venue_id AND is_available = true
    ), 0),
    'totalTeam', COALESCE((
      SELECT COUNT(*) 
      FROM venue_team_contractors 
      WHERE venue_id = p_venue_id
    ), 0),
    'activeTeam', COALESCE((
      SELECT COUNT(*) 
      FROM venue_team_contractors 
      WHERE venue_id = p_venue_id AND is_active = true
    ), 0),
    'avgRating', COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM (
        SELECT AVG(vtm_reviews.rating) as rating
        FROM venue_team_members vtm
        LEFT JOIN staff_reviews vtm_reviews ON vtm.user_id = vtm_reviews.staff_user_id
        WHERE vtm.venue_id = p_venue_id
        GROUP BY vtm.id
        UNION ALL
        SELECT rating
        FROM venue_crew_members vcm
        WHERE vcm.venue_id = p_venue_id AND vcm.rating > 0
        UNION ALL
        SELECT rating  
        FROM venue_team_contractors vtc
        WHERE vtc.venue_id = p_venue_id AND vtc.rating > 0
      ) all_ratings
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hire from job board
CREATE OR REPLACE FUNCTION hire_from_job_board(
  p_application_id UUID,
  p_hire_type TEXT, -- 'staff', 'crew', 'team'
  p_venue_id UUID,
  p_rate DECIMAL(10,2),
  p_additional_info JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  app_record RECORD;
  job_record RECORD;
BEGIN
  -- Get application and job details
  SELECT sa.*, sj.title, sj.description, sj.role
  INTO app_record
  FROM staff_applications sa
  JOIN staff_jobs sj ON sa.job_id = sj.id
  WHERE sa.id = p_application_id;
  
  -- Verify venue ownership
  IF NOT EXISTS (
    SELECT 1 FROM venue_profiles 
    WHERE id = p_venue_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission to hire for this venue';
  END IF;
  
  -- Update application status
  UPDATE staff_applications
  SET 
    status = 'accepted',
    hired_as = p_hire_type,
    hired_date = NOW(),
    final_rate = p_rate,
    updated_at = NOW()
  WHERE id = p_application_id;
  
  -- Create appropriate record based on hire type
  IF p_hire_type = 'staff' THEN
    INSERT INTO venue_team_members (
      venue_id, user_id, name, email, role, employment_type, 
      hourly_rate, status, hire_date
    )
    SELECT 
      p_venue_id,
      app_record.applicant_id,
      COALESCE(p.full_name, 'New Staff Member'),
      COALESCE(u.email, 'unknown@email.com'),
      app_record.title,
      COALESCE(p_additional_info->>'employment_type', 'full_time'),
      p_rate,
      'active',
      NOW()::DATE
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = app_record.applicant_id;
    
  ELSIF p_hire_type = 'crew' THEN
    INSERT INTO venue_crew_members (
      venue_id, user_id, name, email, specialty, rate, 
      rate_type, is_available
    )
    SELECT 
      p_venue_id,
      app_record.applicant_id,
      COALESCE(p.full_name, 'New Crew Member'),
      COALESCE(u.email, 'unknown@email.com'),
      app_record.title,
      p_rate,
      COALESCE(p_additional_info->>'rate_type', 'daily'),
      true
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = app_record.applicant_id;
    
  ELSIF p_hire_type = 'team' THEN
    INSERT INTO venue_team_contractors (
      venue_id, user_id, name, email, role, rate,
      rate_type, is_active
    )
    SELECT 
      p_venue_id,
      app_record.applicant_id,
      COALESCE(p.full_name, 'New Team Member'),
      COALESCE(u.email, 'unknown@email.com'),
      app_record.title,
      p_rate,
      COALESCE(p_additional_info->>'rate_type', 'project'),
      true
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = app_record.applicant_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert sample crew members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venue_profiles LIMIT 1) AND NOT EXISTS (SELECT 1 FROM venue_crew_members LIMIT 1) THEN
    INSERT INTO venue_crew_members (venue_id, name, email, specialty, skills, rate, rate_type, is_available)
    SELECT 
      vp.id,
      'Sample Sound Engineer',
      'sound@example.com',
      'Sound Engineering',
      ARRAY['Live Sound', 'Studio Recording', 'Equipment Setup'],
      150.00,
      'daily',
      true
    FROM venue_profiles vp
    LIMIT 1;
    
    RAISE NOTICE 'Inserted sample crew members';
  END IF;
END $$;

-- Insert sample team contractors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venue_profiles LIMIT 1) AND NOT EXISTS (SELECT 1 FROM venue_team_contractors LIMIT 1) THEN
    INSERT INTO venue_team_contractors (venue_id, name, email, role, specialization, rate, rate_type, is_active)
    SELECT 
      vp.id,
      'Sample Street Team',
      'streetteam@example.com',
      'Marketing Team',
      ARRAY['Street Marketing', 'Event Promotion'],
      2000.00,
      'project',
      true
    FROM venue_profiles vp
    LIMIT 1;
    
    RAISE NOTICE 'Inserted sample team contractors';
  END IF;
END $$; 