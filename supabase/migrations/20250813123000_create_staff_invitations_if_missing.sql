set client_min_messages = warning;

-- Create staff_invitations table if it does not exist, augmented for tour invites

CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  phone TEXT,
  position_details JSONB NOT NULL DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id),
  -- Augmented tour-scoped fields
  tour_id UUID,
  role TEXT,
  origin TEXT DEFAULT 'tour',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_tour ON staff_invitations(tour_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_status ON staff_invitations(status);

-- Enable RLS (policies may already exist in other migrations)
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;


