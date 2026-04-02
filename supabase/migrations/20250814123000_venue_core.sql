-- =============================================================================
-- Venue Core: booking requests, documents, team, analytics, availability, pricing
-- Safe migration (idempotent): uses IF NOT EXISTS guards; no destructive ops
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Tables
-- =============================================================================

-- Booking requests
CREATE TABLE IF NOT EXISTS venue_booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_duration INTEGER NOT NULL,
  expected_attendance INTEGER,
  budget_range TEXT,
  description TEXT,
  special_requirements TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  response_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS venue_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract','rider','insurance','license','safety','marketing','other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members (minimal schema required by app)
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews (optional but used by stats)
CREATE TABLE IF NOT EXISTS venue_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  response_from_venue TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, reviewer_id, event_id)
);

-- Analytics (daily rollup)
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

-- Availability calendar (used by booking approval)
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

-- Optional pricing and social integrations (referenced by UI roadmaps)
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

CREATE TABLE IF NOT EXISTS venue_social_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','twitter','tiktok','youtube')),
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
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_venue_id ON venue_booking_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_status ON venue_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_date ON venue_booking_requests(event_date);

CREATE INDEX IF NOT EXISTS idx_venue_documents_venue_id ON venue_documents(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_documents_type ON venue_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_venue_team_members_venue_id ON venue_team_members(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_team_members_status ON venue_team_members(status);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id ON venue_reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_rating ON venue_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_venue_analytics_venue_id ON venue_analytics(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_analytics_date ON venue_analytics(date);

CREATE INDEX IF NOT EXISTS idx_venue_availability_venue_id ON venue_availability(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_availability_date ON venue_availability(date);

-- =============================================================================
-- RLS Policies (guarded creation)
-- =============================================================================
ALTER TABLE venue_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_social_integrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_booking_requests' AND policyname = 'Venue owners can manage all booking requests for their venues'
  ) THEN
    CREATE POLICY "Venue owners can manage all booking requests for their venues"
      ON venue_booking_requests FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_booking_requests' AND policyname = 'Users can view and manage their own booking requests'
  ) THEN
    CREATE POLICY "Users can view and manage their own booking requests"
      ON venue_booking_requests FOR ALL
      USING (requester_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_documents' AND policyname = 'Venue owners can manage their venue documents'
  ) THEN
    CREATE POLICY "Venue owners can manage their venue documents"
      ON venue_documents FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_documents' AND policyname = 'Public documents are viewable by everyone'
  ) THEN
    CREATE POLICY "Public documents are viewable by everyone"
      ON venue_documents FOR SELECT USING (is_public = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_team_members' AND policyname = 'Venue owners can manage their team members'
  ) THEN
    CREATE POLICY "Venue owners can manage their team members"
      ON venue_team_members FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_team_members' AND policyname = 'Team members can view their own profile'
  ) THEN
    CREATE POLICY "Team members can view their own profile"
      ON venue_team_members FOR SELECT
      USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_reviews' AND policyname = 'Anyone can view venue reviews'
  ) THEN
    CREATE POLICY "Anyone can view venue reviews" ON venue_reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_reviews' AND policyname = 'Users can create reviews'
  ) THEN
    CREATE POLICY "Users can create reviews" ON venue_reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_reviews' AND policyname = 'Reviewers can update their own reviews'
  ) THEN
    CREATE POLICY "Reviewers can update their own reviews" ON venue_reviews FOR UPDATE USING (reviewer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_reviews' AND policyname = 'Venue owners can respond to reviews'
  ) THEN
    CREATE POLICY "Venue owners can respond to reviews" ON venue_reviews FOR UPDATE
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_analytics' AND policyname = 'Venue owners can view their analytics'
  ) THEN
    CREATE POLICY "Venue owners can view their analytics" ON venue_analytics FOR SELECT
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_availability' AND policyname = 'Venue owners can manage their availability'
  ) THEN
    CREATE POLICY "Venue owners can manage their availability" ON venue_availability FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_availability' AND policyname = 'Anyone can view venue availability'
  ) THEN
    CREATE POLICY "Anyone can view venue availability" ON venue_availability FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_pricing' AND policyname = 'Venue owners can manage their pricing'
  ) THEN
    CREATE POLICY "Venue owners can manage their pricing" ON venue_pricing FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_pricing' AND policyname = 'Anyone can view active pricing packages'
  ) THEN
    CREATE POLICY "Anyone can view active pricing packages" ON venue_pricing FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'venue_social_integrations' AND policyname = 'Venue owners can manage their social integrations'
  ) THEN
    CREATE POLICY "Venue owners can manage their social integrations" ON venue_social_integrations FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =============================================================================
-- Functions used by the app/service
-- =============================================================================

-- Dashboard stats aggregator
CREATE OR REPLACE FUNCTION get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalBookings', COALESCE((SELECT COUNT(*) FROM venue_booking_requests WHERE venue_id = p_venue_id AND status = 'approved'), 0),
    'pendingRequests', COALESCE((SELECT COUNT(*) FROM venue_booking_requests WHERE venue_id = p_venue_id AND status = 'pending'), 0),
    'thisMonthRevenue', COALESCE((SELECT SUM(revenue) FROM venue_analytics WHERE venue_id = p_venue_id AND date >= date_trunc('month', CURRENT_DATE)), 0),
    'averageRating', COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM venue_reviews WHERE venue_id = p_venue_id), 0),
    'totalReviews', COALESCE((SELECT COUNT(*) FROM venue_reviews WHERE venue_id = p_venue_id), 0),
    'teamMembers', COALESCE((SELECT COUNT(*) FROM venue_team_members WHERE venue_id = p_venue_id AND status = 'active'), 0),
    'upcomingEvents', COALESCE((
      SELECT COUNT(*) FROM events e
      JOIN venue_booking_requests vbr ON e.id = vbr.event_id
      WHERE vbr.venue_id = p_venue_id AND e.start_date > NOW()
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to a booking request and block date
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
  SELECT vbr.venue_id, vp.user_id INTO request_venue_id, venue_owner_id
  FROM venue_booking_requests vbr
  JOIN venue_profiles vp ON vbr.venue_id = vp.id
  WHERE vbr.id = p_request_id;

  IF venue_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to respond to this booking request';
  END IF;

  UPDATE venue_booking_requests
  SET status = p_status,
      response_message = p_response_message,
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  IF p_status = 'approved' THEN
    INSERT INTO venue_availability (venue_id, date, is_available, booking_id)
    SELECT request_venue_id, event_date::DATE, FALSE, p_request_id
    FROM venue_booking_requests WHERE id = p_request_id
    ON CONFLICT (venue_id, date) DO UPDATE SET is_available = FALSE, booking_id = p_request_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


