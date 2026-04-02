-- =============================================================================
-- TOUR TEAMS MIGRATION
-- This migration adds support for tour teams and team members
-- Migration: 20250130000001_tour_teams.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENSURE TOURS TABLE EXISTS AND HAS REQUIRED COLUMNS
-- =============================================================================

-- First, check if tours table exists, and create it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours') THEN
        -- Create a basic tours table if it doesn't exist
        CREATE TABLE tours (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'planning',
            start_date DATE,
            end_date DATE,
            created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created tours table with created_by column';
    ELSE
        -- Tours table exists, add created_by column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'created_by') THEN
            ALTER TABLE tours ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added created_by column to existing tours table';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- TOUR TEAMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tour_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TOUR TEAM MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tour_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES tour_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role_in_team TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique user per team per tour
    UNIQUE(team_id, user_id, tour_id)
);

-- Legacy `tour_teams` may exist without `created_by`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tour_teams') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tour_teams' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.tour_teams ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tour_team_members') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tour_team_members' AND column_name = 'team_id'
    ) THEN
      ALTER TABLE public.tour_team_members ADD COLUMN team_id UUID REFERENCES public.tour_teams(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tour_team_members' AND column_name = 'assigned_by'
    ) THEN
      ALTER TABLE public.tour_team_members ADD COLUMN assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- BASIC INDEXES FOR PERFORMANCE
-- =============================================================================

-- Tour teams indexes
CREATE INDEX IF NOT EXISTS idx_tour_teams_tour_id ON tour_teams(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_teams_created_by ON tour_teams(created_by);

-- Tour team members indexes
CREATE INDEX IF NOT EXISTS idx_tour_team_members_team_id ON tour_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_user_id ON tour_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_tour_id ON tour_team_members(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_team_members_assigned_by ON tour_team_members(assigned_by);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE tour_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_team_members ENABLE ROW LEVEL SECURITY;

-- Create simple permissive policies for beta (can be enhanced later)
CREATE POLICY "Beta access - users can view teams" ON tour_teams
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Beta access - users can manage teams" ON tour_teams
    FOR ALL USING (auth.role() = 'authenticated');
    
CREATE POLICY "Beta access - users can view team members" ON tour_team_members
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Beta access - users can manage team members" ON tour_team_members
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS trg_tour_teams_updated_at ON tour_teams;
CREATE TRIGGER trg_tour_teams_updated_at
    BEFORE UPDATE ON tour_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tour_team_members_updated_at ON tour_team_members;
CREATE TRIGGER trg_tour_team_members_updated_at
    BEFORE UPDATE ON tour_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- This migration adds:
-- 1. Tour teams table for organizing crew into functional groups
-- 2. Tour team members table for assigning users to teams
-- 3. Basic indexes and RLS policies for security and performance
-- 4. Automatic creation of tours table if it doesn't exist
-- 5. Automatic addition of created_by column to tours table
