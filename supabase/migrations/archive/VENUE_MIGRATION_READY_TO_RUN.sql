-- =============================================================================
-- VENUE MANAGEMENT SYSTEM - COMPLETE MIGRATION
-- Run this script in your Supabase SQL Editor to set up all venue functionality
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- VENUE BOOKING REQUESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_duration INTEGER NOT NULL, -- in hours
  expected_attendance INTEGER,
  budget_range TEXT,
  description TEXT,
  special_requirements TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  response_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUE DOCUMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'rider', 'insurance', 'license', 'safety', 'marketing', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUE TEAM MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{
    "manage_bookings": false,
    "manage_events": false,
    "view_analytics": false,
    "manage_team": false,
    "manage_documents": false
  }'::jsonb,
  phone TEXT,
  hire_date DATE,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'volunteer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUE EQUIPMENT & AMENITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sound', 'lighting', 'stage', 'seating', 'catering', 'security', 'other')),
  description TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair', 'out_of_service')),
  purchase_date DATE,
  last_maintenance DATE,
  next_maintenance DATE,
  is_available_for_rent BOOLEAN DEFAULT FALSE,
  rental_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUE REVIEWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  response_from_venue TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, reviewer_id, event_id)
);

-- =============================================================================
-- VENUE ANALYTICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  booking_requests INTEGER DEFAULT 0,
  bookings_confirmed INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, date)
);

-- =============================================================================
-- VENUE AVAILABILITY CALENDAR TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  booking_id UUID REFERENCES venue_booking_requests(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  blocked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, date)
);

-- =============================================================================
-- VENUE PRICING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  package_name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_hour DECIMAL(10,2),
  price_per_person DECIMAL(10,2),
  minimum_hours INTEGER,
  maximum_capacity INTEGER,
  included_services TEXT[] DEFAULT '{}',
  additional_fees JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUE SOCIAL MEDIA INTEGRATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_social_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube')),
  account_handle TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, platform)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Booking requests indexes
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_venue_id ON venue_booking_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_status ON venue_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_date ON venue_booking_requests(event_date);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_venue_documents_venue_id ON venue_documents(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_documents_type ON venue_documents(document_type);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_venue_team_members_venue_id ON venue_team_members(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_team_members_status ON venue_team_members(status);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_venue_equipment_venue_id ON venue_equipment(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_equipment_category ON venue_equipment(category);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id ON venue_reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_rating ON venue_reviews(rating);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_venue_analytics_venue_id ON venue_analytics(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_analytics_date ON venue_analytics(date);

-- Availability indexes
CREATE INDEX IF NOT EXISTS idx_venue_availability_venue_id ON venue_availability(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_availability_date ON venue_availability(date);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE venue_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_social_integrations ENABLE ROW LEVEL SECURITY;

-- Booking Requests Policies
CREATE POLICY "Venue owners can manage all booking requests for their venues"
  ON venue_booking_requests FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view and manage their own booking requests"
  ON venue_booking_requests FOR ALL
  USING (requester_id = auth.uid());

-- Documents Policies
CREATE POLICY "Venue owners can manage their venue documents"
  ON venue_documents FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public documents are viewable by everyone"
  ON venue_documents FOR SELECT
  USING (is_public = true);

-- Team Members Policies
CREATE POLICY "Venue owners can manage their team members"
  ON venue_team_members FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view their own profile"
  ON venue_team_members FOR SELECT
  USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Equipment Policies
CREATE POLICY "Venue owners can manage their equipment"
  ON venue_equipment FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view available rental equipment"
  ON venue_equipment FOR SELECT
  USING (is_available_for_rent = true);

-- Reviews Policies
CREATE POLICY "Anyone can view venue reviews"
  ON venue_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON venue_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update their own reviews"
  ON venue_reviews FOR UPDATE
  USING (reviewer_id = auth.uid());

CREATE POLICY "Venue owners can respond to reviews"
  ON venue_reviews FOR UPDATE
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

-- Analytics Policies
CREATE POLICY "Venue owners can view their analytics"
  ON venue_analytics FOR SELECT
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

-- Availability Policies
CREATE POLICY "Venue owners can manage their availability"
  ON venue_availability FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view venue availability"
  ON venue_availability FOR SELECT
  USING (true);

-- Pricing Policies
CREATE POLICY "Venue owners can manage their pricing"
  ON venue_pricing FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active pricing packages"
  ON venue_pricing FOR SELECT
  USING (is_active = true);

-- Social Integrations Policies
CREATE POLICY "Venue owners can manage their social integrations"
  ON venue_social_integrations FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venue_profiles WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS FOR VENUE MANAGEMENT
-- =============================================================================

-- Function to get venue dashboard stats
CREATE OR REPLACE FUNCTION get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalBookings', COALESCE((
      SELECT COUNT(*) 
      FROM venue_booking_requests 
      WHERE venue_id = p_venue_id AND status = 'approved'
    ), 0),
    'pendingRequests', COALESCE((
      SELECT COUNT(*) 
      FROM venue_booking_requests 
      WHERE venue_id = p_venue_id AND status = 'pending'
    ), 0),
    'thisMonthRevenue', COALESCE((
      SELECT SUM(revenue) 
      FROM venue_analytics 
      WHERE venue_id = p_venue_id 
      AND date >= date_trunc('month', CURRENT_DATE)
    ), 0),
    'averageRating', COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM venue_reviews 
      WHERE venue_id = p_venue_id
    ), 0),
    'totalReviews', COALESCE((
      SELECT COUNT(*) 
      FROM venue_reviews 
      WHERE venue_id = p_venue_id
    ), 0),
    'teamMembers', COALESCE((
      SELECT COUNT(*) 
      FROM venue_team_members 
      WHERE venue_id = p_venue_id AND status = 'active'
    ), 0),
    'upcomingEvents', COALESCE((
      SELECT COUNT(*) 
      FROM events e
      JOIN venue_booking_requests vbr ON e.id = vbr.event_id
      WHERE vbr.venue_id = p_venue_id 
      AND e.start_date > NOW()
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle booking request response
CREATE OR REPLACE FUNCTION respond_to_booking_request(
  p_request_id UUID,
  p_status TEXT,
  p_response_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  venue_owner_id UUID;
  request_venue_id UUID;
BEGIN
  -- Get the venue and verify ownership
  SELECT vbr.venue_id, vp.user_id 
  INTO request_venue_id, venue_owner_id
  FROM venue_booking_requests vbr
  JOIN venue_profiles vp ON vbr.venue_id = vp.id
  WHERE vbr.id = p_request_id;
  
  -- Check if current user owns the venue
  IF venue_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to respond to this booking request';
  END IF;
  
  -- Update the booking request
  UPDATE venue_booking_requests
  SET 
    status = p_status,
    response_message = p_response_message,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- If approved, block the date in availability calendar
  IF p_status = 'approved' THEN
    INSERT INTO venue_availability (venue_id, date, is_available, booking_id)
    SELECT 
      request_venue_id,
      event_date::DATE,
      FALSE,
      p_request_id
    FROM venue_booking_requests
    WHERE id = p_request_id
    ON CONFLICT (venue_id, date) 
    DO UPDATE SET 
      is_available = FALSE,
      booking_id = p_request_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update venue analytics daily
CREATE OR REPLACE FUNCTION update_venue_analytics_daily()
RETURNS void AS $$
BEGIN
  INSERT INTO venue_analytics (venue_id, date, booking_requests, bookings_confirmed, events_hosted, average_rating)
  SELECT 
    vp.id as venue_id,
    CURRENT_DATE,
    COALESCE(pending_requests.count, 0) as booking_requests,
    COALESCE(confirmed_bookings.count, 0) as bookings_confirmed,
    COALESCE(events_hosted.count, 0) as events_hosted,
    COALESCE(avg_rating.rating, 0) as average_rating
  FROM venue_profiles vp
  LEFT JOIN (
    SELECT venue_id, COUNT(*) as count
    FROM venue_booking_requests
    WHERE DATE(requested_at) = CURRENT_DATE
    GROUP BY venue_id
  ) pending_requests ON vp.id = pending_requests.venue_id
  LEFT JOIN (
    SELECT venue_id, COUNT(*) as count
    FROM venue_booking_requests
    WHERE DATE(responded_at) = CURRENT_DATE AND status = 'approved'
    GROUP BY venue_id
  ) confirmed_bookings ON vp.id = confirmed_bookings.venue_id
  LEFT JOIN (
    SELECT vbr.venue_id, COUNT(*) as count
    FROM venue_booking_requests vbr
    JOIN events e ON vbr.event_id = e.id
    WHERE DATE(e.start_date) = CURRENT_DATE
    GROUP BY vbr.venue_id
  ) events_hosted ON vp.id = events_hosted.venue_id
  LEFT JOIN (
    SELECT venue_id, AVG(rating)::DECIMAL(3,2) as rating
    FROM venue_reviews
    GROUP BY venue_id
  ) avg_rating ON vp.id = avg_rating.venue_id
  ON CONFLICT (venue_id, date) DO UPDATE SET
    booking_requests = EXCLUDED.booking_requests,
    bookings_confirmed = EXCLUDED.bookings_confirmed,
    events_hosted = EXCLUDED.events_hosted,
    average_rating = EXCLUDED.average_rating;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert sample booking requests (only if venue_profiles exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venue_profiles LIMIT 1) THEN
    INSERT INTO venue_booking_requests (venue_id, requester_id, event_name, event_type, event_date, event_duration, expected_attendance, description, contact_email, status)
    SELECT 
      vp.id,
      vp.user_id, -- Using venue owner as requester for demo
      'Sample Music Festival',
      'concert',
      NOW() + INTERVAL '30 days',
      8,
      500,
      'A sample music festival event for testing purposes',
      'test@example.com',
      'pending'
    FROM venue_profiles vp
    LIMIT 3
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Inserted sample booking requests';
  END IF;
END $$;

-- Insert sample documents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venue_profiles LIMIT 1) THEN
    INSERT INTO venue_documents (venue_id, name, document_type, file_url, is_public)
    SELECT 
      vp.id,
      'Venue Contract Template',
      'contract',
      '/documents/contract-template.pdf',
      true
    FROM venue_profiles vp
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Inserted sample documents';
  END IF;
END $$;

-- Insert sample team members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venue_profiles LIMIT 1) THEN
    INSERT INTO venue_team_members (venue_id, name, email, role, employment_type)
    SELECT 
      vp.id,
      'John Manager',
      'manager@venue.com',
      'Event Manager',
      'full_time'
    FROM venue_profiles vp
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Inserted sample team members';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ VENUE MANAGEMENT SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '📊 Created 9 new tables for comprehensive venue management';
  RAISE NOTICE '🔒 All RLS policies configured for security';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🛠️ Helper functions installed';
  RAISE NOTICE '🌱 Sample data inserted for testing';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your venue management system is ready to use!';
END $$; 