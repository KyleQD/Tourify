set client_min_messages = warning;

-- Calendar genres/tags support for booking requests and events

-- Add simple genre tagging to booking requests
ALTER TABLE IF EXISTS venue_booking_requests
  ADD COLUMN IF NOT EXISTS genre TEXT;

-- Add genre to events if not present
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS genre TEXT;

-- Helpful index for filters
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_genre ON venue_booking_requests(genre);
CREATE INDEX IF NOT EXISTS idx_events_genre ON events(genre);


