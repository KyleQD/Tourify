-- Critical Missing Tables for Tourify Platform
-- Run this AFTER simple_auth_fix.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TOURS TABLE (Referenced but missing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(12,2),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 2. BOOKINGS TABLE (For confirmed bookings)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  ticket_quantity INTEGER NOT NULL CHECK (ticket_quantity > 0),
  total_price DECIMAL(10,2) NOT NULL,
  booking_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 3. BOOKING REQUESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  booking_details JSONB NOT NULL DEFAULT '{}',
  token TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  request_type TEXT DEFAULT 'performance' CHECK (request_type IN ('performance', 'collaboration')),
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure either artist_id is set OR email/phone is provided
  CONSTRAINT booking_request_recipient_check CHECK (
    (artist_id IS NOT NULL) OR (email IS NOT NULL OR phone IS NOT NULL)
  ),
  
  -- Ensure either event_id or tour_id is set
  CONSTRAINT booking_request_target_check CHECK (
    (event_id IS NOT NULL AND tour_id IS NULL) OR 
    (tour_id IS NOT NULL AND event_id IS NULL)
  )
);

-- =============================================================================
-- 4. ARTIST WORKS TABLE (Portfolio)
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT,
  duration INTEGER, -- for audio/video in seconds
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 5. ARTIST EVENTS TABLE (Artist-specific events)
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('concert', 'festival', 'tour', 'recording', 'interview', 'other')),
  venue_name TEXT,
  venue_address TEXT,
  venue_city TEXT,
  venue_state TEXT,
  venue_country TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  doors_open TIME,
  ticket_url TEXT,
  ticket_price_min DECIMAL(10,2),
  ticket_price_max DECIMAL(10,2),
  capacity INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled', 'postponed')),
  is_public BOOLEAN DEFAULT true,
  poster_url TEXT,
  setlist TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 6. NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 7. STAFF JOBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS staff_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  pay_rate TEXT,
  requirements TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 8. STAFF APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS staff_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES staff_jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(job_id, applicant_id)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_applications ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can manage their own tours" ON tours FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookings" ON bookings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own booking requests" ON booking_requests FOR ALL USING (auth.uid() = artist_id);
CREATE POLICY "Users can manage their own artist works" ON artist_works FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public artist works" ON artist_works FOR SELECT USING (true);
CREATE POLICY "Users can manage their own artist events" ON artist_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public artist events" ON artist_events FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view all jobs" ON staff_jobs FOR SELECT USING (true);
CREATE POLICY "Job posters can manage their jobs" ON staff_jobs FOR UPDATE USING (auth.uid() = posted_by);
CREATE POLICY "Users can manage their own applications" ON staff_applications FOR ALL USING (auth.uid() = applicant_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Tours indexes
CREATE INDEX IF NOT EXISTS idx_tours_user_id ON tours(user_id);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_dates ON tours(start_date, end_date);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Booking requests indexes
CREATE INDEX IF NOT EXISTS idx_booking_requests_artist ON booking_requests(artist_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_event ON booking_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_tour ON booking_requests(tour_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);

-- Artist content indexes
CREATE INDEX IF NOT EXISTS idx_artist_works_user_id ON artist_works(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_works_type ON artist_works(media_type);
CREATE INDEX IF NOT EXISTS idx_artist_events_user_id ON artist_events(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_events_date ON artist_events(event_date);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_staff_jobs_posted_by ON staff_jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_staff_jobs_status ON staff_jobs(status);
CREATE INDEX IF NOT EXISTS idx_staff_applications_job_id ON staff_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_staff_applications_applicant_id ON staff_applications(applicant_id);

-- =============================================================================
-- UPDATE TRIGGERS
-- =============================================================================

-- Function to update updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
DROP TRIGGER IF EXISTS update_tours_updated_at ON tours;
CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON booking_requests;
CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON booking_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_artist_works_updated_at ON artist_works;
CREATE TRIGGER update_artist_works_updated_at BEFORE UPDATE ON artist_works FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_artist_events_updated_at ON artist_events;
CREATE TRIGGER update_artist_events_updated_at BEFORE UPDATE ON artist_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_jobs_updated_at ON staff_jobs;
CREATE TRIGGER update_staff_jobs_updated_at BEFORE UPDATE ON staff_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_applications_updated_at ON staff_applications;
CREATE TRIGGER update_staff_applications_updated_at BEFORE UPDATE ON staff_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'CRITICAL MISSING TABLES SETUP COMPLETED!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added 8 critical tables:';
  RAISE NOTICE '✅ tours - Tour management system';
  RAISE NOTICE '✅ bookings - Event booking system';
  RAISE NOTICE '✅ booking_requests - Booking request system';
  RAISE NOTICE '✅ artist_works - Artist portfolio system';
  RAISE NOTICE '✅ artist_events - Artist events system';
  RAISE NOTICE '✅ notifications - Notification system';
  RAISE NOTICE '✅ staff_jobs - Job posting system';
  RAISE NOTICE '✅ staff_applications - Job application system';
  RAISE NOTICE '';
  RAISE NOTICE 'Your core Tourify functionality is now ready!';
  RAISE NOTICE '====================================================';
END $$; 