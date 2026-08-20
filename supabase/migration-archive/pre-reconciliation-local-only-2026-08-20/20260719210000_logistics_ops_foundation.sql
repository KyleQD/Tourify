-- Additive logistics foundation: source links, acknowledgements, equipment reservations,
-- backline, catering, and comms plans. Non-destructive; no drops/renames.

-- ---------------------------------------------------------------------------
-- logistics_tasks source linkage
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS logistics_tasks
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_logistics_tasks_source
  ON logistics_tasks (source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Acknowledgements for critical changes / assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  event_id uuid,
  tour_id uuid,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'declined')),
  required boolean NOT NULL DEFAULT true,
  comment text,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_acks_source
  ON logistics_acknowledgements (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_logistics_acks_user
  ON logistics_acknowledgements (user_id, status);

ALTER TABLE logistics_acknowledgements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_acknowledgements'
      AND policyname = 'logistics_acks_select_own_or_admin'
  ) THEN
    CREATE POLICY logistics_acks_select_own_or_admin ON logistics_acknowledgements
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_acknowledgements'
      AND policyname = 'logistics_acks_insert_authenticated'
  ) THEN
    CREATE POLICY logistics_acks_insert_authenticated ON logistics_acknowledgements
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'logistics_acknowledgements'
      AND policyname = 'logistics_acks_update_own'
  ) THEN
    CREATE POLICY logistics_acks_update_own ON logistics_acknowledgements
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Equipment reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  event_id uuid,
  tour_id uuid,
  equipment_asset_id uuid,
  catalog_item_id uuid,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'requested', 'reserved', 'picked', 'in_transit', 'delivered',
      'checked_out', 'deployed', 'returned', 'damaged', 'lost', 'cancelled', 'unavailable'
    )),
  responsible_user_id uuid,
  vendor_id uuid,
  projected_cost numeric(12, 2),
  actual_cost numeric(12, 2),
  notes text,
  created_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_equipment_reservations_scope
  ON equipment_reservations (event_id, tour_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_asset_window
  ON equipment_reservations (equipment_asset_id, starts_at, ends_at)
  WHERE equipment_asset_id IS NOT NULL AND status NOT IN ('cancelled', 'returned');

ALTER TABLE equipment_reservations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_reservations'
      AND policyname = 'equipment_reservations_authenticated_all'
  ) THEN
    CREATE POLICY equipment_reservations_authenticated_all ON equipment_reservations
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backline requirements / fulfillments / substitutions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backline_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  event_id uuid,
  tour_id uuid,
  artist_account_id uuid,
  performance_name text,
  gear_type text NOT NULL,
  requested_make_model text,
  acceptable_alternatives text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  configuration_notes text,
  tuning_notes text,
  consumables text,
  power_voltage text,
  placement_notes text,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  requires_artist_approval boolean NOT NULL DEFAULT false,
  rider_version text,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'draft', 'requested', 'sourcing', 'fulfilled', 'partial',
      'approved', 'rejected', 'cancelled', 'issue'
    )),
  setup_deadline timestamptz,
  projected_cost numeric(12, 2),
  actual_cost numeric(12, 2),
  created_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backline_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES backline_requirements(id) ON DELETE CASCADE,
  source_type text NOT NULL
    CHECK (source_type IN ('organization', 'venue', 'artist', 'vendor', 'rental', 'other')),
  equipment_asset_id uuid,
  vendor_id uuid,
  provider_contact text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition text,
  delivery_at timestamptz,
  pickup_at timestamptz,
  responsible_user_id uuid,
  quote_reference text,
  projected_cost numeric(12, 2),
  actual_cost numeric(12, 2),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'confirmed', 'delivered', 'setup', 'returned', 'cancelled', 'issue'
    )),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backline_substitution_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES backline_requirements(id) ON DELETE CASCADE,
  fulfillment_id uuid REFERENCES backline_fulfillments(id) ON DELETE SET NULL,
  proposed_make_model text NOT NULL,
  reason text,
  photo_url text,
  requester_user_id uuid,
  approver_user_id uuid,
  decision text NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'approved', 'changes_requested', 'rejected')),
  decision_comment text,
  rider_version text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backline_requirements_scope
  ON backline_requirements (event_id, tour_id, status);
CREATE INDEX IF NOT EXISTS idx_backline_fulfillments_requirement
  ON backline_fulfillments (requirement_id);

ALTER TABLE backline_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE backline_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE backline_substitution_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'backline_requirements' AND policyname = 'backline_requirements_authenticated_all'
  ) THEN
    CREATE POLICY backline_requirements_authenticated_all ON backline_requirements
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'backline_fulfillments' AND policyname = 'backline_fulfillments_authenticated_all'
  ) THEN
    CREATE POLICY backline_fulfillments_authenticated_all ON backline_fulfillments
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'backline_substitution_approvals' AND policyname = 'backline_subs_authenticated_all'
  ) THEN
    CREATE POLICY backline_subs_authenticated_all ON backline_substitution_approvals
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Catering
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catering_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  event_id uuid,
  tour_id uuid,
  service_type text NOT NULL DEFAULT 'meal'
    CHECK (service_type IN (
      'breakfast', 'lunch', 'dinner', 'late_night', 'craft_services',
      'dressing_room', 'green_room', 'bus_stock', 'buyout', 'custom', 'meal'
    )),
  title text NOT NULL,
  service_date date,
  window_start timestamptz,
  window_end timestamptz,
  location_label text,
  site_map_id uuid,
  site_map_version_id uuid,
  anchor_id text,
  department_scope text,
  vendor_id uuid,
  menu text,
  service_style text,
  headcount_manual integer,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'draft', 'requested', 'quoted', 'approved', 'ordered', 'confirmed',
      'delivered', 'served', 'completed', 'cancelled', 'issue'
    )),
  projected_cost numeric(12, 2),
  actual_cost numeric(12, 2),
  timezone text DEFAULT 'UTC',
  notes text,
  created_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catering_headcount_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catering_service_id uuid NOT NULL REFERENCES catering_services(id) ON DELETE CASCADE,
  snapshot_label text,
  headcount integer NOT NULL CHECK (headcount >= 0),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'assignments', 'imported', 'advancing')),
  is_frozen boolean NOT NULL DEFAULT false,
  frozen_at timestamptz,
  frozen_by uuid,
  variance_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catering_dietary_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catering_service_id uuid NOT NULL REFERENCES catering_services(id) ON DELETE CASCADE,
  headcount integer NOT NULL DEFAULT 0,
  preference_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  allergy_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  unspecified_count integer NOT NULL DEFAULT 0,
  safety_instructions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catering_services_scope
  ON catering_services (event_id, tour_id, status);

ALTER TABLE catering_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_headcount_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_dietary_summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catering_services' AND policyname = 'catering_services_authenticated_all'
  ) THEN
    CREATE POLICY catering_services_authenticated_all ON catering_services
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catering_headcount_snapshots' AND policyname = 'catering_snapshots_authenticated_all'
  ) THEN
    CREATE POLICY catering_snapshots_authenticated_all ON catering_headcount_snapshots
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catering_dietary_summaries' AND policyname = 'catering_dietary_authenticated_all'
  ) THEN
    CREATE POLICY catering_dietary_authenticated_all ON catering_dietary_summaries
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Comms plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_comms_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  event_id uuid,
  tour_id uuid,
  site_map_id uuid,
  title text NOT NULL,
  version_label text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'superseded', 'archived')),
  operating_date date,
  escalation_notes text,
  published_at timestamptz,
  published_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_comms_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES logistics_comms_plans(id) ON DELETE CASCADE,
  channel_type text NOT NULL
    CHECK (channel_type IN (
      'radio', 'intercom', 'phone', 'group_chat', 'email', 'external', 'other'
    )),
  name text NOT NULL,
  purpose text,
  audience_label text,
  active_window_start timestamptz,
  active_window_end timestamptz,
  owner_user_id uuid,
  backup_contact text,
  instructions text,
  visibility text NOT NULL DEFAULT 'assigned_team'
    CHECK (visibility IN (
      'admin_internal', 'assigned_team', 'specific_users', 'venue_shared', 'vendor_shared'
    )),
  is_restricted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_comms_plans_scope
  ON logistics_comms_plans (event_id, tour_id, status);

ALTER TABLE logistics_comms_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_comms_channels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'logistics_comms_plans' AND policyname = 'comms_plans_authenticated_all'
  ) THEN
    CREATE POLICY comms_plans_authenticated_all ON logistics_comms_plans
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'logistics_comms_channels' AND policyname = 'comms_channels_authenticated_all'
  ) THEN
    CREATE POLICY comms_channels_authenticated_all ON logistics_comms_channels
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Ground transport additive columns (non-destructive)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS ground_transportation_coordination
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS origin_venue_id uuid,
  ADD COLUMN IF NOT EXISTS destination_venue_id uuid,
  ADD COLUMN IF NOT EXISTS operational_address jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cargo_notes text,
  ADD COLUMN IF NOT EXISTS is_passenger boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_cargo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_buffer_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE IF EXISTS flight_coordination
  ADD COLUMN IF NOT EXISTS timezone_departure text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS timezone_arrival text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS lodging_bookings
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;

-- site_maps published version pointer (additive)
ALTER TABLE IF EXISTS site_maps
  ADD COLUMN IF NOT EXISTS current_published_version_id uuid,
  ADD COLUMN IF NOT EXISTS publish_change_summary text;

-- map_versions publish snapshot fields (additive; do not alter builder)
ALTER TABLE IF EXISTS map_versions
  ADD COLUMN IF NOT EXISTS snapshot_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS change_summary text,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
