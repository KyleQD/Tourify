-- Port tables referenced in application code that were only in backup migrations.
-- Uses IF NOT EXISTS / CREATE ... IF NOT EXISTS throughout to be safely idempotent.

-- =============================================================================
-- 1. venue_equipment
-- =============================================================================
CREATE TABLE IF NOT EXISTS venue_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('sound','lighting','stage','seating','catering','security','other')) DEFAULT 'other',
  description TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT CHECK (condition IN ('excellent','good','fair','poor','needs_repair')) DEFAULT 'good',
  purchase_date DATE,
  last_maintenance_date DATE,
  is_available_for_rent BOOLEAN DEFAULT false,
  rental_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE venue_equipment ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_equipment' AND policyname='venue_equipment_owner_all') THEN
    CREATE POLICY venue_equipment_owner_all ON venue_equipment FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_equipment' AND policyname='venue_equipment_public_rental') THEN
    CREATE POLICY venue_equipment_public_rental ON venue_equipment FOR SELECT
      USING (is_available_for_rent = true);
  END IF;
END $$;

-- =============================================================================
-- 2. venue_roles / venue_permissions / venue_role_permissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS venue_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  role_description TEXT,
  role_level INTEGER DEFAULT 0,
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venue_id, role_name)
);
ALTER TABLE venue_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_roles' AND policyname='venue_roles_owner_manage') THEN
    CREATE POLICY venue_roles_owner_manage ON venue_roles FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_roles' AND policyname='venue_roles_staff_read') THEN
    CREATE POLICY venue_roles_staff_read ON venue_roles FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venue_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_name TEXT UNIQUE NOT NULL,
  permission_description TEXT,
  permission_category TEXT,
  is_system_permission BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE venue_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_permissions' AND policyname='venue_permissions_read') THEN
    CREATE POLICY venue_permissions_read ON venue_permissions FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venue_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES venue_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES venue_permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
ALTER TABLE venue_role_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_role_permissions' AND policyname='venue_role_permissions_owner') THEN
    CREATE POLICY venue_role_permissions_owner ON venue_role_permissions FOR ALL
      USING (role_id IN (SELECT id FROM venue_roles WHERE venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid())));
  END IF;
END $$;

-- =============================================================================
-- 3. venue_shifts / venue_shift_assignments / venue_recurring_shifts
-- =============================================================================
CREATE TABLE IF NOT EXISTS venue_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  event_id UUID,
  shift_title TEXT NOT NULL,
  shift_description TEXT,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  department TEXT,
  role_required TEXT,
  staff_needed INTEGER DEFAULT 1,
  staff_assigned INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  flat_rate DECIMAL(10,2),
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  shift_status TEXT DEFAULT 'open' CHECK (shift_status IN ('open','filled','in_progress','completed','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  dress_code TEXT,
  requirements TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE venue_shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_shifts' AND policyname='venue_shifts_owner') THEN
    CREATE POLICY venue_shifts_owner ON venue_shifts FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_shifts' AND policyname='venue_shifts_staff_read') THEN
    CREATE POLICY venue_shifts_staff_read ON venue_shifts FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venue_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES venue_shifts(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL,
  assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending','confirmed','declined','no_show','completed')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(shift_id, staff_member_id)
);
ALTER TABLE venue_shift_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_shift_assignments' AND policyname='venue_shift_assignments_auth') THEN
    CREATE POLICY venue_shift_assignments_auth ON venue_shift_assignments FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venue_recurring_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  shift_title TEXT NOT NULL,
  shift_description TEXT,
  department TEXT,
  role_required TEXT,
  staff_needed INTEGER DEFAULT 1,
  hourly_rate DECIMAL(10,2),
  start_time TIME,
  end_time TIME,
  location TEXT,
  recurrence_pattern JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE venue_recurring_shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venue_recurring_shifts' AND policyname='venue_recurring_shifts_owner') THEN
    CREATE POLICY venue_recurring_shifts_owner ON venue_recurring_shifts FOR ALL
      USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =============================================================================
-- 4. staff_contracts / staff_schedules
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id),
  template_id UUID,
  contract_type TEXT,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending','active','expired','terminated')),
  start_date DATE,
  end_date DATE,
  terms JSONB,
  signatures JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_contracts' AND policyname='staff_contracts_auth') THEN
    CREATE POLICY staff_contracts_auth ON staff_contracts FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES auth.users(id),
  event_id UUID,
  tour_id UUID,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_schedules' AND policyname='staff_schedules_auth') THEN
    CREATE POLICY staff_schedules_auth ON staff_schedules FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =============================================================================
-- 5. onboarding_templates / onboarding_flows
-- =============================================================================
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  flow_type TEXT CHECK (flow_type IN ('artist','venue','staff','invitation')) NOT NULL,
  fields JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='onboarding_templates' AND policyname='onboarding_templates_read') THEN
    CREATE POLICY onboarding_templates_read ON onboarding_templates FOR SELECT
      USING (is_active = true AND auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_type TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  template_id UUID REFERENCES onboarding_templates(id),
  responses JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, flow_type)
);
ALTER TABLE onboarding_flows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='onboarding_flows' AND policyname='onboarding_flows_own') THEN
    CREATE POLICY onboarding_flows_own ON onboarding_flows FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- 6. staff_onboarding_templates / staff_onboarding_steps
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  description TEXT,
  estimated_days INTEGER,
  required_documents TEXT[],
  assignees UUID[],
  tags TEXT[],
  is_default BOOLEAN DEFAULT false,
  last_used TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_onboarding_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_onboarding_templates' AND policyname='staff_onboarding_templates_auth') THEN
    CREATE POLICY staff_onboarding_templates_auth ON staff_onboarding_templates FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS staff_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES staff_onboarding_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  step_type TEXT DEFAULT 'task',
  category TEXT,
  required BOOLEAN DEFAULT true,
  estimated_hours DECIMAL(5,2),
  assigned_to UUID,
  depends_on UUID[],
  due_date_offset INTEGER,
  instructions TEXT,
  completion_criteria TEXT,
  documents TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_onboarding_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_onboarding_steps' AND policyname='staff_onboarding_steps_auth') THEN
    CREATE POLICY staff_onboarding_steps_auth ON staff_onboarding_steps FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =============================================================================
-- 7. scheduled_posts (base CREATE TABLE for the ALTER migrations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID,
  content TEXT,
  media_urls TEXT[],
  hashtags TEXT[],
  location TEXT,
  post_type TEXT DEFAULT 'standard',
  visibility TEXT DEFAULT 'public',
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  repeat_pattern TEXT,
  repeat_config JSONB,
  target_accounts UUID[],
  account_specific_content JSONB,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','posting','posted','failed','cancelled')),
  posted_at TIMESTAMPTZ,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_posts' AND policyname='scheduled_posts_own') THEN
    CREATE POLICY scheduled_posts_own ON scheduled_posts FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- 8. booking_requests (distinct from venue_booking_requests)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID,
  tour_id UUID,
  email TEXT,
  phone TEXT,
  booking_details JSONB,
  token TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  request_type TEXT DEFAULT 'booking',
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Legacy DBs may already have booking_requests without artist_id; CREATE TABLE IF NOT EXISTS
-- does not add missing columns, but RLS policies and indexes require this column.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_requests' AND policyname='booking_requests_own') THEN
    CREATE POLICY booking_requests_own ON booking_requests FOR ALL
      USING (artist_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_requests' AND policyname='booking_requests_read_auth') THEN
    CREATE POLICY booking_requests_read_auth ON booking_requests FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =============================================================================
-- 9. staff_onboarding (singular, used by staff-onboarding.service.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES staff_onboarding_templates(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  progress JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_onboarding ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_onboarding' AND policyname='staff_onboarding_own') THEN
    CREATE POLICY staff_onboarding_own ON staff_onboarding FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- Indexes for commonly queried columns
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_venue_equipment_venue ON venue_equipment(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_shifts_venue_date ON venue_shifts(venue_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_venue_shifts_status ON venue_shifts(shift_status);
CREATE INDEX IF NOT EXISTS idx_venue_shift_assignments_shift ON venue_shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_contracts_venue ON staff_contracts(venue_id);
CREATE INDEX IF NOT EXISTS idx_staff_contracts_employee ON staff_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_flows_user ON onboarding_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_booking_requests_artist ON booking_requests(artist_id);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_user ON staff_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_venue ON staff_onboarding(venue_id);
