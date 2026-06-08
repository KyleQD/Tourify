-- Direct fix for tour_team_members and tour_vendors tables
-- Run this in the Supabase SQL Editor

-- First, let's check what exists
SELECT 'tour_team_members columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tour_team_members' 
ORDER BY ordinal_position;

SELECT 'tour_vendors exists:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tour_vendors'
) as tour_vendors_exists;

-- Add missing columns to tour_team_members if they don't exist
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'name') THEN
        ALTER TABLE tour_team_members ADD COLUMN name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added name column to tour_team_members';
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'role') THEN
        ALTER TABLE tour_team_members ADD COLUMN role TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added role column to tour_team_members';
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'email') THEN
        ALTER TABLE tour_team_members ADD COLUMN email TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added email column to tour_team_members';
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'phone') THEN
        ALTER TABLE tour_team_members ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column to tour_team_members';
    END IF;
    
    -- Add avatar column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'avatar') THEN
        ALTER TABLE tour_team_members ADD COLUMN avatar TEXT;
        RAISE NOTICE 'Added avatar column to tour_team_members';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'status') THEN
        ALTER TABLE tour_team_members ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Added status column to tour_team_members';
    END IF;
    
    -- Add arrival_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'arrival_date') THEN
        ALTER TABLE tour_team_members ADD COLUMN arrival_date DATE;
        RAISE NOTICE 'Added arrival_date column to tour_team_members';
    END IF;
    
    -- Add departure_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'departure_date') THEN
        ALTER TABLE tour_team_members ADD COLUMN departure_date DATE;
        RAISE NOTICE 'Added departure_date column to tour_team_members';
    END IF;
    
    -- Add responsibilities column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_team_members' AND column_name = 'responsibilities') THEN
        ALTER TABLE tour_team_members ADD COLUMN responsibilities TEXT;
        RAISE NOTICE 'Added responsibilities column to tour_team_members';
    END IF;
END $$;

-- Create tour_vendors table if it doesn't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tour_team_members_tour_id ON tour_team_members(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_user_id ON tour_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_status ON tour_team_members(status);

CREATE INDEX IF NOT EXISTS idx_tour_vendors_tour_id ON tour_vendors(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_user_id ON tour_vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_status ON tour_vendors(status);
CREATE INDEX IF NOT EXISTS idx_tour_vendors_type ON tour_vendors(type);

-- Enable RLS if not already enabled
ALTER TABLE tour_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tour_team_members (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_team_members' AND policyname = 'Users can view their tour team members') THEN
    CREATE POLICY "Users can view their tour team members" ON tour_team_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_team_members.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_team_members view policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_team_members' AND policyname = 'Users can insert their tour team members') THEN
    CREATE POLICY "Users can insert their tour team members" ON tour_team_members
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_team_members.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_team_members insert policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_team_members' AND policyname = 'Users can update their tour team members') THEN
    CREATE POLICY "Users can update their tour team members" ON tour_team_members
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_team_members.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_team_members update policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_team_members' AND policyname = 'Users can delete their tour team members') THEN
    CREATE POLICY "Users can delete their tour team members" ON tour_team_members
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_team_members.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_team_members delete policy';
  END IF;
END $$;

-- Create RLS policies for tour_vendors (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_vendors' AND policyname = 'Users can view their tour vendors') THEN
    CREATE POLICY "Users can view their tour vendors" ON tour_vendors
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_vendors.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_vendors view policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_vendors' AND policyname = 'Users can insert their tour vendors') THEN
    CREATE POLICY "Users can insert their tour vendors" ON tour_vendors
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_vendors.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_vendors insert policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_vendors' AND policyname = 'Users can update their tour vendors') THEN
    CREATE POLICY "Users can update their tour vendors" ON tour_vendors
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_vendors.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_vendors update policy';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_vendors' AND policyname = 'Users can delete their tour vendors') THEN
    CREATE POLICY "Users can delete their tour vendors" ON tour_vendors
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM tours 
          WHERE tours.id = tour_vendors.tour_id 
          AND tours.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Created tour_vendors delete policy';
  END IF;
END $$;

-- Create updated_at triggers if they don't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tour_team_members_updated_at') THEN
    CREATE TRIGGER update_tour_team_members_updated_at
        BEFORE UPDATE ON tour_team_members
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created tour_team_members updated_at trigger';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tour_vendors_updated_at') THEN
    CREATE TRIGGER update_tour_vendors_updated_at
        BEFORE UPDATE ON tour_vendors
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created tour_vendors updated_at trigger';
  END IF;
END $$;

-- Verify the fix
SELECT 'Final verification:' as info;
SELECT 'tour_team_members columns:' as table_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tour_team_members' 
ORDER BY ordinal_position;

SELECT 'tour_vendors exists:' as table_info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tour_vendors'
) as tour_vendors_exists;

SELECT 'tour_vendors columns:' as table_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tour_vendors' 
ORDER BY ordinal_position; 