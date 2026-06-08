-- Fix tour_team_members table
-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS tour_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  arrival_date DATE,
  departure_date DATE,
  responsibilities TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table exists but columns are missing
DO $$
BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'name') THEN
    ALTER TABLE tour_team_members ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'role') THEN
    ALTER TABLE tour_team_members ADD COLUMN role TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'email') THEN
    ALTER TABLE tour_team_members ADD COLUMN email TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'phone') THEN
    ALTER TABLE tour_team_members ADD COLUMN phone TEXT;
  END IF;
  
  -- Add avatar column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'avatar') THEN
    ALTER TABLE tour_team_members ADD COLUMN avatar TEXT;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'status') THEN
    ALTER TABLE tour_team_members ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
  
  -- Add arrival_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'arrival_date') THEN
    ALTER TABLE tour_team_members ADD COLUMN arrival_date DATE;
  END IF;
  
  -- Add departure_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'departure_date') THEN
    ALTER TABLE tour_team_members ADD COLUMN departure_date DATE;
  END IF;
  
  -- Add responsibilities column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'responsibilities') THEN
    ALTER TABLE tour_team_members ADD COLUMN responsibilities TEXT;
  END IF;
END $$;

-- Create tour_vendors table
CREATE TABLE IF NOT EXISTS tour_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  services TEXT[] DEFAULT '{}',
  contract_amount DECIMAL(10,2),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'partial', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tour_team_members_tour_id ON tour_team_members(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_user_id ON tour_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_status ON tour_team_members(status);

CREATE INDEX IF NOT EXISTS idx_tour_vendors_tour_id ON tour_vendors(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_user_id ON tour_vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_status ON tour_vendors(status);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_type ON tour_vendors(type);

-- Enable RLS
ALTER TABLE tour_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tour_team_members
DROP POLICY IF EXISTS "Users can view their tour team members" ON tour_team_members;
CREATE POLICY "Users can view their tour team members" ON tour_team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_team_members.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their tour team members" ON tour_team_members;
CREATE POLICY "Users can insert their tour team members" ON tour_team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_team_members.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their tour team members" ON tour_team_members;
CREATE POLICY "Users can update their tour team members" ON tour_team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_team_members.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their tour team members" ON tour_team_members;
CREATE POLICY "Users can delete their tour team members" ON tour_team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_team_members.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

-- Create RLS policies for tour_vendors
DROP POLICY IF EXISTS "Users can view their tour vendors" ON tour_vendors;
CREATE POLICY "Users can view their tour vendors" ON tour_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_vendors.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their tour vendors" ON tour_vendors;
CREATE POLICY "Users can insert their tour vendors" ON tour_vendors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_vendors.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their tour vendors" ON tour_vendors;
CREATE POLICY "Users can update their tour vendors" ON tour_vendors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_vendors.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their tour vendors" ON tour_vendors;
CREATE POLICY "Users can delete their tour vendors" ON tour_vendors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tours 
      WHERE tours.id = tour_vendors.tour_id 
      AND tours.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tour_team_members_updated_at ON tour_team_members;
CREATE TRIGGER update_tour_team_members_updated_at
    BEFORE UPDATE ON tour_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tour_vendors_updated_at ON tour_vendors;
CREATE TRIGGER update_tour_vendors_updated_at
    BEFORE UPDATE ON tour_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 