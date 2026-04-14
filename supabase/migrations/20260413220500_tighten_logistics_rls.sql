-- =============================================================================
-- Tighten RLS on logistics domain tables
-- Replaces blanket auth.uid() IS NOT NULL checks with proper scoping:
--   • creator / assigned_by / managed_by owns the record
--   • tour_team_members grants event & tour-level access
--   • travel_group_members grants travel-group-level access
--   • records with no event_id/tour_id fall back to authenticated (org-level)
--
-- Reference/lookup tables (lodging_providers, lodging_room_types,
-- lodging_availability, rental_clients) keep their existing authenticated-
-- user policies since they have no event/tour columns to scope on.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions
--    SECURITY DEFINER so they bypass RLS on the team/membership tables.
--    STABLE because they don't modify data.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_event_team_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tour_team_members ttm
    JOIN tour_events te ON te.tour_id = ttm.tour_id
    WHERE te.event_id = p_event_id
      AND ttm.user_id = auth.uid()
      AND ttm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_tour_team_member(p_tour_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tour_team_members ttm
    WHERE ttm.tour_id = p_tour_id
      AND ttm.user_id = auth.uid()
      AND ttm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_travel_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM travel_group_members tgm
    WHERE tgm.group_id = p_group_id
      AND tgm.user_id = auth.uid()
  );
$$;

-- =============================================================================
-- 2. LODGING policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- lodging_bookings  (has event_id, tour_id, assigned_by, managed_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS lodging_bookings_select ON lodging_bookings;
CREATE POLICY lodging_bookings_select ON lodging_bookings FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR managed_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS lodging_bookings_manage ON lodging_bookings;
CREATE POLICY lodging_bookings_manage ON lodging_bookings FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR managed_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

-- ---------------------------------------------------------------------------
-- lodging_guest_assignments  (child → lodging_bookings.booking_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS lodging_guest_assignments_select ON lodging_guest_assignments;
CREATE POLICY lodging_guest_assignments_select ON lodging_guest_assignments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS lodging_guest_assignments_manage ON lodging_guest_assignments;
CREATE POLICY lodging_guest_assignments_manage ON lodging_guest_assignments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- lodging_payments  (child → lodging_bookings.booking_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS lodging_payments_select ON lodging_payments;
CREATE POLICY lodging_payments_select ON lodging_payments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS lodging_payments_manage ON lodging_payments;
CREATE POLICY lodging_payments_manage ON lodging_payments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- lodging_calendar_events  (child → lodging_bookings.booking_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS lodging_calendar_events_select ON lodging_calendar_events;
CREATE POLICY lodging_calendar_events_select ON lodging_calendar_events FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS lodging_calendar_events_manage ON lodging_calendar_events;
CREATE POLICY lodging_calendar_events_manage ON lodging_calendar_events FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

-- =============================================================================
-- 3. RENTAL policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rental_agreements  (has event_id, tour_id, created_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS rental_agreements_select ON rental_agreements;
CREATE POLICY rental_agreements_select ON rental_agreements FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS rental_agreements_manage ON rental_agreements;
CREATE POLICY rental_agreements_manage ON rental_agreements FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

-- ---------------------------------------------------------------------------
-- rental_agreement_items  (child → rental_agreements.rental_agreement_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS rental_agreement_items_select ON rental_agreement_items;
CREATE POLICY rental_agreement_items_select ON rental_agreement_items FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rental_agreements ra WHERE ra.id = rental_agreement_id
    AND (
      ra.created_by = auth.uid()
      OR (ra.event_id IS NOT NULL AND is_event_team_member(ra.event_id))
      OR (ra.tour_id  IS NOT NULL AND is_tour_team_member(ra.tour_id))
      OR (ra.event_id IS NULL AND ra.tour_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS rental_agreement_items_manage ON rental_agreement_items;
CREATE POLICY rental_agreement_items_manage ON rental_agreement_items FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rental_agreements ra WHERE ra.id = rental_agreement_id
    AND (
      ra.created_by = auth.uid()
      OR (ra.event_id IS NOT NULL AND is_event_team_member(ra.event_id))
      OR (ra.tour_id  IS NOT NULL AND is_tour_team_member(ra.tour_id))
      OR (ra.event_id IS NULL AND ra.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- rental_payments  (child → rental_agreements.rental_agreement_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS rental_payments_select ON rental_payments;
CREATE POLICY rental_payments_select ON rental_payments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rental_agreements ra WHERE ra.id = rental_agreement_id
    AND (
      ra.created_by = auth.uid()
      OR (ra.event_id IS NOT NULL AND is_event_team_member(ra.event_id))
      OR (ra.tour_id  IS NOT NULL AND is_tour_team_member(ra.tour_id))
      OR (ra.event_id IS NULL AND ra.tour_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS rental_payments_manage ON rental_payments;
CREATE POLICY rental_payments_manage ON rental_payments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM rental_agreements ra WHERE ra.id = rental_agreement_id
    AND (
      ra.created_by = auth.uid()
      OR (ra.event_id IS NOT NULL AND is_event_team_member(ra.event_id))
      OR (ra.tour_id  IS NOT NULL AND is_tour_team_member(ra.tour_id))
      OR (ra.event_id IS NULL AND ra.tour_id IS NULL)
    )
  )
);

-- =============================================================================
-- 4. TRAVEL policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- travel_groups  (has event_id, tour_id, created_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS travel_groups_select ON travel_groups;
CREATE POLICY travel_groups_select ON travel_groups FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR is_travel_group_member(id)
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS travel_groups_manage ON travel_groups;
CREATE POLICY travel_groups_manage ON travel_groups FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

-- ---------------------------------------------------------------------------
-- travel_group_members  (child → travel_groups.group_id, has user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS travel_group_members_select ON travel_group_members;
CREATE POLICY travel_group_members_select ON travel_group_members FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM travel_groups tg WHERE tg.id = group_id
      AND (
        tg.created_by = auth.uid()
        OR (tg.event_id IS NOT NULL AND is_event_team_member(tg.event_id))
        OR (tg.tour_id  IS NOT NULL AND is_tour_team_member(tg.tour_id))
        OR (tg.event_id IS NULL AND tg.tour_id IS NULL)
      )
    )
  )
);

DROP POLICY IF EXISTS travel_group_members_manage ON travel_group_members;
CREATE POLICY travel_group_members_manage ON travel_group_members FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM travel_groups tg WHERE tg.id = group_id
    AND (
      tg.created_by = auth.uid()
      OR (tg.event_id IS NOT NULL AND is_event_team_member(tg.event_id))
      OR (tg.tour_id  IS NOT NULL AND is_tour_team_member(tg.tour_id))
      OR (tg.event_id IS NULL AND tg.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- flight_coordination  (has event_id, tour_id, group_id, assigned_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS flight_coordination_select ON flight_coordination;
CREATE POLICY flight_coordination_select ON flight_coordination FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR (group_id  IS NOT NULL AND is_travel_group_member(group_id))
    OR (event_id  IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id   IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS flight_coordination_manage ON flight_coordination;
CREATE POLICY flight_coordination_manage ON flight_coordination FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR (group_id  IS NOT NULL AND is_travel_group_member(group_id))
    OR (event_id  IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id   IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

-- ---------------------------------------------------------------------------
-- flight_passenger_assignments  (child → flight_coordination.flight_id)
-- Passengers can also see their own assignment.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS flight_passenger_assignments_select ON flight_passenger_assignments;
CREATE POLICY flight_passenger_assignments_select ON flight_passenger_assignments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM travel_group_members tgm
      WHERE tgm.id = group_member_id AND tgm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM flight_coordination fc WHERE fc.id = flight_id
      AND (
        fc.assigned_by = auth.uid()
        OR (fc.group_id  IS NOT NULL AND is_travel_group_member(fc.group_id))
        OR (fc.event_id  IS NOT NULL AND is_event_team_member(fc.event_id))
        OR (fc.tour_id   IS NOT NULL AND is_tour_team_member(fc.tour_id))
        OR (fc.event_id IS NULL AND fc.tour_id IS NULL)
      )
    )
  )
);

DROP POLICY IF EXISTS flight_passenger_assignments_manage ON flight_passenger_assignments;
CREATE POLICY flight_passenger_assignments_manage ON flight_passenger_assignments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM flight_coordination fc WHERE fc.id = flight_id
    AND (
      fc.assigned_by = auth.uid()
      OR (fc.event_id IS NOT NULL AND is_event_team_member(fc.event_id))
      OR (fc.tour_id  IS NOT NULL AND is_tour_team_member(fc.tour_id))
      OR (fc.event_id IS NULL AND fc.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- ground_transportation_coordination  (has event_id, tour_id, group_id, assigned_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ground_transportation_select ON ground_transportation_coordination;
CREATE POLICY ground_transportation_select ON ground_transportation_coordination FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR (group_id  IS NOT NULL AND is_travel_group_member(group_id))
    OR (event_id  IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id   IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS ground_transportation_manage ON ground_transportation_coordination;
CREATE POLICY ground_transportation_manage ON ground_transportation_coordination FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR (group_id  IS NOT NULL AND is_travel_group_member(group_id))
    OR (event_id  IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id   IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

-- ---------------------------------------------------------------------------
-- transportation_passenger_assignments  (child → ground_transportation_coordination)
-- Passengers can also see their own assignment.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS transport_passenger_select ON transportation_passenger_assignments;
CREATE POLICY transport_passenger_select ON transportation_passenger_assignments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM travel_group_members tgm
      WHERE tgm.id = group_member_id AND tgm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM ground_transportation_coordination gtc WHERE gtc.id = transportation_id
      AND (
        gtc.assigned_by = auth.uid()
        OR (gtc.group_id  IS NOT NULL AND is_travel_group_member(gtc.group_id))
        OR (gtc.event_id  IS NOT NULL AND is_event_team_member(gtc.event_id))
        OR (gtc.tour_id   IS NOT NULL AND is_tour_team_member(gtc.tour_id))
        OR (gtc.event_id IS NULL AND gtc.tour_id IS NULL)
      )
    )
  )
);

DROP POLICY IF EXISTS transport_passenger_manage ON transportation_passenger_assignments;
CREATE POLICY transport_passenger_manage ON transportation_passenger_assignments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM ground_transportation_coordination gtc WHERE gtc.id = transportation_id
    AND (
      gtc.assigned_by = auth.uid()
      OR (gtc.event_id IS NOT NULL AND is_event_team_member(gtc.event_id))
      OR (gtc.tour_id  IS NOT NULL AND is_tour_team_member(gtc.tour_id))
      OR (gtc.event_id IS NULL AND gtc.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- hotel_room_assignments  (child → lodging_bookings via lodging_booking_id)
-- Assigned members can also see their own assignment.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS hotel_room_assignments_select ON hotel_room_assignments;
CREATE POLICY hotel_room_assignments_select ON hotel_room_assignments FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM travel_group_members tgm
      WHERE tgm.id = group_member_id AND tgm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lodging_bookings lb WHERE lb.id = lodging_booking_id
      AND (
        lb.assigned_by = auth.uid()
        OR lb.managed_by = auth.uid()
        OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
        OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
        OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
      )
    )
  )
);

DROP POLICY IF EXISTS hotel_room_assignments_manage ON hotel_room_assignments;
CREATE POLICY hotel_room_assignments_manage ON hotel_room_assignments FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lodging_bookings lb WHERE lb.id = lodging_booking_id
    AND (
      lb.assigned_by = auth.uid()
      OR lb.managed_by = auth.uid()
      OR (lb.event_id IS NOT NULL AND is_event_team_member(lb.event_id))
      OR (lb.tour_id  IS NOT NULL AND is_tour_team_member(lb.tour_id))
      OR (lb.event_id IS NULL AND lb.tour_id IS NULL)
    )
  )
);

-- ---------------------------------------------------------------------------
-- travel_coordination_timeline  (has event_id, tour_id, group_id, created_by)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS travel_timeline_select ON travel_coordination_timeline;
CREATE POLICY travel_timeline_select ON travel_coordination_timeline FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (group_id  IS NOT NULL AND is_travel_group_member(group_id))
    OR (event_id  IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id   IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);

DROP POLICY IF EXISTS travel_timeline_manage ON travel_coordination_timeline;
CREATE POLICY travel_timeline_manage ON travel_coordination_timeline FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (event_id IS NOT NULL AND is_event_team_member(event_id))
    OR (tour_id  IS NOT NULL AND is_tour_team_member(tour_id))
    OR (event_id IS NULL AND tour_id IS NULL)
  )
);
