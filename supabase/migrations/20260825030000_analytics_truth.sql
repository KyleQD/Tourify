-- =============================================================================
-- VEN-183 — Observable analytics rollup pipeline + dashboard truth repair
--
-- Defects:
--   1. get_venue_dashboard_stats sourced thisMonthRevenue from venue_analytics,
--      a table NO code wrote — dashboards permanently showed 0.
--   2. update_venue_analytics_daily() existed but was never scheduled and its
--      events_hosted branch joined legacy `events`.
--
-- Contract after this migration:
--   - Dashboard stats derive from canonical tables directly.
--   - refresh_venue_analytics_daily() upserts per-day rows from REAL sources
--     (booking requests, events_v2 settings link, reviews, manual ledger),
--     preserving existing page_views/unique_visitors traffic columns.
--   - Backfills the trailing 30 days immediately so the rollup is observable
--     without waiting a day; pg_cron schedules it nightly when available.
-- =============================================================================

-- ── 1. Dashboard stats from canonical sources ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalBookings', COALESCE((
      SELECT COUNT(*) FROM venue_booking_requests
      WHERE venue_id = p_venue_id AND status = 'approved'
    ), 0),
    'pendingRequests', COALESCE((
      SELECT COUNT(*) FROM venue_booking_requests
      WHERE venue_id = p_venue_id AND status = 'pending'
    ), 0),
    -- VEN-183: recorded money only — completed ledger entries this month.
    'thisMonthRevenue', COALESCE((
      SELECT SUM(amount) FROM venue_manual_transactions
      WHERE venue_id = p_venue_id
        AND type = 'income'
        AND status = 'completed'
        AND date >= date_trunc('month', CURRENT_DATE)
    ), 0)::DECIMAL(12,2),
    'averageRating', COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2) FROM venue_reviews WHERE venue_id = p_venue_id
    ), 0),
    'totalReviews', COALESCE((SELECT COUNT(*) FROM venue_reviews WHERE venue_id = p_venue_id), 0),
    'teamMembers', COALESCE((
      SELECT COUNT(*) FROM venue_team_members
      WHERE venue_id = p_venue_id AND status = 'active'
    ), 0),
    -- Events linked through the canonical settings bridge (not legacy joins).
    'upcomingEvents', COALESCE((
      SELECT COUNT(*) FROM events_v2 e
      WHERE e.settings ->> 'venue_profile_id' = p_venue_id::text
        AND e.start_at > NOW()
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_venue_dashboard_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_venue_dashboard_stats(UUID) TO authenticated;

-- ── 2. Real-source daily rollup (idempotent per venue/day) ───────────────────

CREATE OR REPLACE FUNCTION public.refresh_venue_analytics_daily(p_days INT DEFAULT 2)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT := 0;
  target_day DATE;
BEGIN
  IF p_days IS NULL OR p_days < 1 OR p_days > 400 THEN
    RAISE EXCEPTION 'days_out_of_range';
  END IF;

  FOR offset_days IN REVERSE (p_days - 1)..0 LOOP
    target_day := CURRENT_DATE - offset_days;

    WITH requested AS (
      SELECT venue_id, COUNT(*) AS c
      FROM venue_booking_requests
      WHERE DATE(requested_at) = target_day
      GROUP BY venue_id
    ),
    confirmed AS (
      SELECT venue_id, COUNT(*) AS c
      FROM venue_booking_requests
      WHERE DATE(responded_at) = target_day AND status = 'approved'
      GROUP BY venue_id
    ),
    hosted AS (
      SELECT settings->>'venue_profile_id' AS venue_uuid, COUNT(*) AS c
      FROM events_v2
      WHERE DATE(start_at) = target_day
        AND settings ? 'venue_profile_id'
      GROUP BY settings->>'venue_profile_id'
    ),
    rated AS (
      SELECT venue_id, AVG(rating)::DECIMAL(3,2) AS avg
      FROM venue_reviews
      WHERE DATE(created_at) = target_day
      GROUP BY venue_id
    ),
    money AS (
      SELECT venue_id, SUM(amount) AS revenue
      FROM venue_manual_transactions
      WHERE type = 'income' AND status = 'completed' AND date = target_day
      GROUP BY venue_id
    )
    INSERT INTO venue_analytics (venue_id, date, booking_requests, bookings_confirmed, events_hosted, average_rating, revenue)
    SELECT vp.id, target_day,
           COALESCE(requested.c, 0),
           COALESCE(confirmed.c, 0),
           COALESCE(hosted.c, 0),
           rated.avg,
           COALESCE(money.revenue, 0)
    FROM venue_profiles vp
    LEFT JOIN requested ON requested.venue_id = vp.id
    LEFT JOIN confirmed ON confirmed.venue_id = vp.id
    LEFT JOIN hosted ON hosted.venue_uuid = vp.id::text
    LEFT JOIN rated ON rated.venue_id = vp.id
    LEFT JOIN money ON money.venue_id = vp.id
    WHERE requested.venue_id IS NOT NULL
       OR confirmed.venue_id IS NOT NULL
       OR hosted.venue_uuid IS NOT NULL
       OR money.venue_id IS NOT NULL
    ON CONFLICT (venue_id, date) DO UPDATE SET
      booking_requests = EXCLUDED.booking_requests,
      bookings_confirmed = EXCLUDED.bookings_confirmed,
      events_hosted = EXCLUDED.events_hosted,
      average_rating = EXCLUDED.average_rating,
      revenue = EXCLUDED.revenue;

    GET DIAGNOSTICS affected = affected + ROW_COUNT;
  END LOOP;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_venue_analytics_daily(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_venue_analytics_daily(INT) TO service_role, authenticated;

COMMENT ON FUNCTION public.refresh_venue_analytics_daily(INT) IS
  'VEN-183: idempotent daily rollup of booking/event/rating/revenue facts into venue_analytics from canonical sources.';

-- ── 3. Immediate backfill (trailing 30 days) so the table is observable now ──
DO $$
BEGIN
  PERFORM public.refresh_venue_analytics_daily(30);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'VEN-183 backfill skipped: %', SQLERRM;
END $$;

-- ── 4. Nightly schedule when pg_cron is available ─────────────────────────────
DO $$
DECLARE
  cron_available BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO cron_available;
  IF cron_available THEN
    PERFORM cron.unschedule('venue-analytics-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'venue-analytics-daily');
    PERFORM cron.schedule('venue-analytics-daily', '15 2 * * *', 'SELECT public.refresh_venue_analytics_daily(3);');
    RAISE NOTICE 'VEN-183: nightly rollup scheduled at 02:15 UTC';
  ELSE
    RAISE NOTICE 'VEN-183: pg_cron unavailable — call refresh_venue_analytics_daily(3) from app scheduler';
  END IF;
END $$;
