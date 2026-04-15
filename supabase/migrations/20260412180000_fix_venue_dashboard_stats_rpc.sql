set client_min_messages = warning;

-- Fix get_venue_dashboard_stats: venue_booking_requests has no event_id in core schema.
-- Upcoming events should be counted from events.venue_id instead of a broken join.

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
      SELECT COUNT(*)::INT
      FROM public.events e
      WHERE e.venue_id = p_venue_id
        AND COALESCE(e.event_date::timestamptz, e.date, e.created_at) > NOW()
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
