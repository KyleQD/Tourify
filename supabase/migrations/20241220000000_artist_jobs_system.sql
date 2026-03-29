-- =============================================================================
-- ARTIST JOBS SYSTEM MIGRATION
-- This migration creates the complete artist jobs ecosystem
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ARTIST JOB CATEGORIES TABLE
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

-- Insert default categories
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
-- ARTIST JOBS TABLE
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
-- ARTIST JOB APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE SET NULL,
  
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
-- ARTIST JOB VIEWS TABLE (for analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- ARTIST JOB SAVES TABLE (bookmarks)
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_job_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES artist_jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique save per job per user
  UNIQUE(job_id, user_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Job search indexes
CREATE INDEX idx_artist_jobs_category ON artist_jobs(category_id);
CREATE INDEX idx_artist_jobs_status ON artist_jobs(status);
CREATE INDEX idx_artist_jobs_location ON artist_jobs(city, state, country);
CREATE INDEX idx_artist_jobs_date ON artist_jobs(event_date);
CREATE INDEX idx_artist_jobs_created ON artist_jobs(created_at DESC);
CREATE INDEX idx_artist_jobs_payment ON artist_jobs(payment_type, payment_amount);

-- Application indexes
CREATE INDEX idx_artist_job_applications_job ON artist_job_applications(job_id);
CREATE INDEX idx_artist_job_applications_applicant ON artist_job_applications(applicant_id);
CREATE INDEX idx_artist_job_applications_status ON artist_job_applications(status);
CREATE INDEX idx_artist_job_applications_applied ON artist_job_applications(applied_at DESC);

-- View and save indexes
CREATE INDEX idx_artist_job_views_job ON artist_job_views(job_id);
CREATE INDEX idx_artist_job_saves_user ON artist_job_saves(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE artist_job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_job_saves ENABLE ROW LEVEL SECURITY;

-- Categories (public read)
CREATE POLICY "Anyone can view job categories"
  ON artist_job_categories FOR SELECT
  USING (true);

-- Jobs policies
CREATE POLICY "Anyone can view open jobs"
  ON artist_jobs FOR SELECT
  USING (status = 'open');

CREATE POLICY "Users can view their own jobs"
  ON artist_jobs FOR SELECT
  USING (auth.uid() = posted_by);

CREATE POLICY "Authenticated users can create jobs"
  ON artist_jobs FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can update their own jobs"
  ON artist_jobs FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "Users can delete their own jobs"
  ON artist_jobs FOR DELETE
  USING (auth.uid() = posted_by);

-- Applications policies
CREATE POLICY "Users can view applications to their jobs"
  ON artist_job_applications FOR SELECT
  USING (
    auth.uid() = applicant_id OR
    auth.uid() IN (
      SELECT posted_by FROM artist_jobs WHERE id = job_id
    )
  );

CREATE POLICY "Users can create applications"
  ON artist_job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own applications"
  ON artist_job_applications FOR UPDATE
  USING (auth.uid() = applicant_id);

CREATE POLICY "Job posters can update application status"
  ON artist_job_applications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT posted_by FROM artist_jobs WHERE id = job_id
    )
  );

-- Views policies
CREATE POLICY "Users can create job views"
  ON artist_job_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

CREATE POLICY "Users can view job views for their jobs"
  ON artist_job_views FOR SELECT
  USING (
    auth.uid() IN (
      SELECT posted_by FROM artist_jobs WHERE id = job_id
    )
  );

-- Saves policies
CREATE POLICY "Users can manage their own saves"
  ON artist_job_saves FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update job application count
CREATE OR REPLACE FUNCTION update_job_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE artist_jobs 
    SET applications_count = applications_count + 1
    WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE artist_jobs 
    SET applications_count = applications_count - 1
    WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for application count
CREATE TRIGGER trigger_update_job_application_count
  AFTER INSERT OR DELETE ON artist_job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_job_application_count();

-- Function to update job view count
CREATE OR REPLACE FUNCTION update_job_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE artist_jobs 
  SET views_count = views_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for view count
CREATE TRIGGER trigger_update_job_view_count
  AFTER INSERT ON artist_job_views
  FOR EACH ROW
  EXECUTE FUNCTION update_job_view_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_artist_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_artist_jobs_updated_at
  BEFORE UPDATE ON artist_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_jobs_updated_at();

-- =============================================================================
-- SAMPLE DATA (for development)
-- =============================================================================

-- Sample data removed to avoid foreign key issues during migration
-- Can be added later with actual user IDs

-- INSERT INTO artist_jobs (
--   title, description, category_id, posted_by, posted_by_type, job_type, 
--   payment_type, payment_amount, location, city, state, country, event_date,
--   required_skills, required_genres, status
-- ) VALUES (
--   'Opening Act Needed for Rock Concert',
--   'Looking for an energetic rock band to open for our upcoming concert at The Fillmore. Great opportunity for exposure and networking.',
--   (SELECT id FROM artist_job_categories WHERE name = 'Opening Slots'),
--   '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual user ID
--   'venue',
--   'one_time',
--   'paid',
--   500.00,
--   'The Fillmore, San Francisco, CA',
--   'San Francisco',
--   'CA',
--   'USA',
--   '2024-01-15',
--   ARRAY['Live Performance', 'Stage Presence'],
--   ARRAY['Rock', 'Alternative Rock'],
--   'open'
-- ); 