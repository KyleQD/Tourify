-- =============================================================================
-- ARTIST JOBS SYSTEM & COLLABORATION FEATURES
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CREATE ARTIST JOB CATEGORIES TABLE IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon name for UI
  color TEXT, -- Color scheme
  parent_category_id UUID REFERENCES artist_job_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default categories if they don't exist
INSERT INTO artist_job_categories (name, description, icon, color) VALUES
('Opening Slots', 'Opening act opportunities for concerts and tours', 'Music', '#8B5CF6'),
('Venue Bookings', 'Direct booking opportunities at venues', 'MapPin', '#10B981'),
('Collaborations', 'Music collaborations with other artists', 'Users', '#F59E0B'),
('Session Work', 'Studio session musician opportunities', 'Mic', '#EF4444'),
('Production', 'Music production and mixing opportunities', 'Settings', '#6366F1'),
('Touring', 'Tour musician and crew opportunities', 'Truck', '#EC4899'),
('Festivals', 'Festival performance opportunities', 'Calendar', '#14B8A6'),
('Teaching', 'Music education and lesson opportunities', 'Book', '#F97316'),
('Events', 'Private events and corporate gigs', 'Star', '#84CC16'),
('Online', 'Virtual performances and streaming opportunities', 'Monitor', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- CREATE ARTIST JOBS TABLE IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES artist_job_categories(id) NOT NULL,
  
  -- Posting User
  posted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  posted_by_type TEXT NOT NULL CHECK (posted_by_type IN ('artist', 'venue', 'organizer', 'manager')),
  poster_profile_id UUID, -- Could be artist_profile_id or venue_profile_id
  
  -- Job Details
  job_type TEXT NOT NULL CHECK (job_type IN ('one_time', 'recurring', 'tour', 'residency', 'collaboration')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('paid', 'unpaid', 'revenue_share', 'exposure')),
  payment_amount DECIMAL(10,2),
  payment_currency TEXT DEFAULT 'USD',
  payment_description TEXT,
  
  -- Location & Timing
  location TEXT,
  location_type TEXT CHECK (location_type IN ('in_person', 'remote', 'hybrid')),
  city TEXT,
  state TEXT,
  country TEXT,
  event_date DATE,
  event_time TIME,
  duration_hours INTEGER,
  deadline DATE,
  
  -- Requirements
  required_skills TEXT[] DEFAULT '{}',
  required_equipment TEXT[] DEFAULT '{}',
  required_experience TEXT, -- 'beginner', 'intermediate', 'professional'
  required_genres TEXT[] DEFAULT '{}',
  age_requirement TEXT,
  
  -- Additional Info
  benefits TEXT[] DEFAULT '{}',
  special_requirements TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  external_link TEXT,
  
  -- Status & Metadata
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'paused', 'closed', 'filled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  featured BOOLEAN DEFAULT false,
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- ADD COLLABORATION-SPECIFIC FIELDS TO ARTIST JOBS TABLE
-- =============================================================================

-- Add collaboration-specific fields to existing or newly created artist_jobs table
DO $$
BEGIN
  -- Add instruments_needed field for collaboration-specific requirements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_jobs' AND column_name = 'instruments_needed') THEN
    ALTER TABLE artist_jobs ADD COLUMN instruments_needed TEXT[] DEFAULT '{}';
  END IF;

  -- Add genre field for better collaboration matching
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_jobs' AND column_name = 'genre') THEN
    ALTER TABLE artist_jobs ADD COLUMN genre TEXT;
  END IF;

  -- Add attachments field for demo files, stems, etc.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_jobs' AND column_name = 'attachments') THEN
    ALTER TABLE artist_jobs ADD COLUMN attachments JSONB DEFAULT '{}';
  END IF;

  -- Add collaboration_details field for additional collaboration-specific info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_jobs' AND column_name = 'collaboration_details') THEN
    ALTER TABLE artist_jobs ADD COLUMN collaboration_details JSONB DEFAULT '{}';
  END IF;
END $$;

-- =============================================================================
-- CREATE ARTIST JOB APPLICATIONS TABLE IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID, -- References to artist_profiles if it exists
  
  -- Application Content
  cover_letter TEXT,
  portfolio_links TEXT[] DEFAULT '{}',
  experience_description TEXT,
  availability_notes TEXT,
  
  -- Files
  resume_url TEXT,
  demo_reel_url TEXT,
  additional_files TEXT[] DEFAULT '{}',
  
  -- Status & Metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  -- Communication
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'platform')),
  
  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique application per job per user
  UNIQUE(job_id, applicant_id)
);

-- =============================================================================
-- CREATE SUPPORTING TABLES IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS artist_job_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique save per job per user
  UNIQUE(job_id, user_id)
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Job search indexes
CREATE INDEX IF NOT EXISTS idx_artist_jobs_category ON artist_jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_artist_jobs_status ON artist_jobs(status);
CREATE INDEX IF NOT EXISTS idx_artist_jobs_location ON artist_jobs(city, state, country);
CREATE INDEX IF NOT EXISTS idx_artist_jobs_date ON artist_jobs(event_date);
CREATE INDEX IF NOT EXISTS idx_artist_jobs_created ON artist_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artist_jobs_payment ON artist_jobs(payment_type, payment_amount);

-- Application indexes
CREATE INDEX IF NOT EXISTS idx_artist_job_applications_job ON artist_job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_artist_job_applications_applicant ON artist_job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_artist_job_applications_status ON artist_job_applications(status);
CREATE INDEX IF NOT EXISTS idx_artist_job_applications_applied ON artist_job_applications(applied_at DESC);

-- View and save indexes
CREATE INDEX IF NOT EXISTS idx_artist_job_views_job ON artist_job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_artist_job_saves_job ON artist_job_saves(job_id);
CREATE INDEX IF NOT EXISTS idx_artist_job_saves_user ON artist_job_saves(user_id);

-- =============================================================================
-- UPDATE JOB TYPE CHECK CONSTRAINT
-- =============================================================================

-- Ensure collaboration is included in job_type constraint
ALTER TABLE artist_jobs DROP CONSTRAINT IF EXISTS artist_jobs_job_type_check;
ALTER TABLE artist_jobs ADD CONSTRAINT artist_jobs_job_type_check 
CHECK (job_type IN ('one_time', 'recurring', 'tour', 'residency', 'collaboration'));

-- =============================================================================
-- CREATE COLLABORATION APPLICATIONS TABLE
-- =============================================================================

-- Create a specialized table for collaboration applications with additional fields
CREATE TABLE IF NOT EXISTS collaboration_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Base application fields (inherits from artist_job_applications structure)
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Collaboration-specific application fields
  message TEXT,
  sample_attachments JSONB DEFAULT '{}', -- URLs to demo files, portfolio items
  available_instruments TEXT[] DEFAULT '{}',
  collaboration_interest TEXT, -- What they want to contribute
  previous_collaborations TEXT, -- Brief description of past work
  
  -- Contact and logistics
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'platform')),
  
  -- Status and metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
  response_message TEXT, -- Response from collaboration poster
  
  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_collaboration_application UNIQUE (job_id, applicant_id)
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for collaboration job type filtering
CREATE INDEX IF NOT EXISTS idx_artist_jobs_collaboration_type 
ON artist_jobs(job_type) WHERE job_type = 'collaboration';

-- Index for collaboration applications
CREATE INDEX IF NOT EXISTS idx_collaboration_applications_job_id 
ON collaboration_applications(job_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_applicant_id 
ON collaboration_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_status 
ON collaboration_applications(status);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on collaboration_applications table
ALTER TABLE collaboration_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view collaboration applications for jobs they posted
CREATE POLICY "Users can view applications for their collaboration jobs"
ON collaboration_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM artist_jobs 
    WHERE artist_jobs.id = collaboration_applications.job_id 
    AND artist_jobs.posted_by = auth.uid()
  )
);

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own collaboration applications"
ON collaboration_applications FOR SELECT
USING (applicant_id = auth.uid());

-- Policy: Authenticated users can apply to collaborations
CREATE POLICY "Authenticated users can apply to collaborations"
ON collaboration_applications FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' 
  AND applicant_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM artist_jobs 
    WHERE artist_jobs.id = collaboration_applications.job_id 
    AND artist_jobs.status = 'open'
    AND artist_jobs.job_type = 'collaboration'
  )
);

-- Policy: Users can update their own applications
CREATE POLICY "Users can update their own collaboration applications"
ON collaboration_applications FOR UPDATE
USING (applicant_id = auth.uid())
WITH CHECK (applicant_id = auth.uid());

-- Policy: Job posters can update application status
CREATE POLICY "Job posters can update collaboration application status"
ON collaboration_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM artist_jobs 
    WHERE artist_jobs.id = collaboration_applications.job_id 
    AND artist_jobs.posted_by = auth.uid()
  )
);

-- =============================================================================
-- UPDATE EXISTING ARTIST_JOBS RLS POLICIES
-- =============================================================================

-- Policy: Only artists can post collaboration jobs (extends existing policies)
DROP POLICY IF EXISTS "Artists can create collaboration jobs" ON artist_jobs;
CREATE POLICY "Artists can create collaboration jobs"
ON artist_jobs FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND posted_by = auth.uid()
  AND (
    job_type != 'collaboration'
    OR EXISTS (
      SELECT 1 FROM artist_profiles
      WHERE artist_profiles.user_id = auth.uid()
    )
  )
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get collaboration statistics
CREATE OR REPLACE FUNCTION get_collaboration_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_collaborations_posted', (
      SELECT COUNT(*) FROM artist_jobs 
      WHERE posted_by = user_uuid AND job_type = 'collaboration'
    ),
    'active_collaborations', (
      SELECT COUNT(*) FROM artist_jobs 
      WHERE posted_by = user_uuid AND job_type = 'collaboration' AND status = 'open'
    ),
    'total_applications_received', (
      SELECT COUNT(*) FROM collaboration_applications ca
      JOIN artist_jobs aj ON ca.job_id = aj.id
      WHERE aj.posted_by = user_uuid AND aj.job_type = 'collaboration'
    ),
    'total_applications_sent', (
      SELECT COUNT(*) FROM collaboration_applications 
      WHERE applicant_id = user_uuid
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_collaboration_stats(UUID) TO authenticated;