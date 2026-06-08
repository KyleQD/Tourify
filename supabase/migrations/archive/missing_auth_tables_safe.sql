-- Safe Auth Tables Setup for Tourify Login/Signup Flow
-- This version handles existing tables properly and avoids column reference errors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CREATE MISSING TABLES ONLY
-- =============================================================================

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create onboarding table if it doesn't exist
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completed BOOLEAN DEFAULT false,
  current_step TEXT DEFAULT 'welcome',
  steps_completed TEXT[] DEFAULT '{}',
  onboarding_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on existing and new tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
END $$;

-- =============================================================================
-- CREATE SAFE RLS POLICIES
-- =============================================================================

-- Profiles policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

    CREATE POLICY "Users can view all profiles"
      ON profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can update their own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);

    CREATE POLICY "Users can insert their own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Artist profiles policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    DROP POLICY IF EXISTS "Users can view all artist profiles" ON artist_profiles;
    DROP POLICY IF EXISTS "Users can manage their own artist profiles" ON artist_profiles;

    CREATE POLICY "Users can view all artist profiles"
      ON artist_profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can manage their own artist profiles"
      ON artist_profiles FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Venue profiles policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    DROP POLICY IF EXISTS "Users can view all venue profiles" ON venue_profiles;
    DROP POLICY IF EXISTS "Users can manage their own venue profiles" ON venue_profiles;

    CREATE POLICY "Users can view all venue profiles"
      ON venue_profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can manage their own venue profiles"
      ON venue_profiles FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- User sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON user_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Onboarding policies
DROP POLICY IF EXISTS "Users can view their own onboarding" ON onboarding;
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON onboarding;

CREATE POLICY "Users can view their own onboarding"
  ON onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own onboarding"
  ON onboarding FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, full_name, username, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  );

  -- Create onboarding record
  INSERT INTO onboarding (user_id, completed, current_step)
  VALUES (NEW.id, false, 'welcome');

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return NEW
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS SAFELY
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create update triggers for existing tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    DROP TRIGGER IF EXISTS update_artist_profiles_updated_at ON artist_profiles;
    CREATE TRIGGER update_artist_profiles_updated_at
      BEFORE UPDATE ON artist_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON venue_profiles;
    CREATE TRIGGER update_venue_profiles_updated_at
      BEFORE UPDATE ON venue_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create triggers for new tables
DROP TRIGGER IF EXISTS update_onboarding_updated_at ON onboarding;
CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS FOR ACCOUNT CREATION
-- =============================================================================

-- Function to create artist account
CREATE OR REPLACE FUNCTION create_artist_account(
  user_id UUID,
  artist_name TEXT,
  bio TEXT DEFAULT NULL,
  genres TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  main_profile_id UUID;
  artist_profile_id UUID;
BEGIN
  -- Get main profile
  SELECT id INTO main_profile_id FROM profiles WHERE id = user_id;
  
  IF main_profile_id IS NULL THEN
    RAISE EXCEPTION 'Main profile not found for user %', user_id;
  END IF;

  -- Check if artist_profiles table exists and has the right columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    RAISE EXCEPTION 'Artist profiles table does not exist. Please run the setup first.';
  END IF;

  -- Create artist profile (basic version for compatibility)
  INSERT INTO artist_profiles (user_id, artist_name)
  VALUES (user_id, artist_name)
  RETURNING id INTO artist_profile_id;

  -- Update profile if role column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    UPDATE profiles SET role = 'artist' WHERE id = user_id;
  END IF;

  -- Update onboarding completion if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = user_id;
  END IF;

  -- Update onboarding record
  UPDATE onboarding SET 
    completed = true,
    completed_at = TIMEZONE('utc'::text, NOW()),
    current_step = 'completed'
  WHERE user_id = user_id;

  RETURN artist_profile_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An artist with the name "%" already exists for this user', artist_name;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create artist account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create venue account
CREATE OR REPLACE FUNCTION create_venue_account(
  user_id UUID,
  venue_name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  main_profile_id UUID;
  venue_profile_id UUID;
BEGIN
  -- Get main profile
  SELECT id INTO main_profile_id FROM profiles WHERE id = user_id;
  
  IF main_profile_id IS NULL THEN
    RAISE EXCEPTION 'Main profile not found for user %', user_id;
  END IF;

  -- Check if venue_profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    RAISE EXCEPTION 'Venue profiles table does not exist. Please run the setup first.';
  END IF;

  -- Create venue profile (basic version for compatibility)
  INSERT INTO venue_profiles (user_id, venue_name)
  VALUES (user_id, venue_name)
  RETURNING id INTO venue_profile_id;

  -- Update profile if role column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    UPDATE profiles SET role = 'venue' WHERE id = user_id;
  END IF;

  -- Update onboarding completion if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = user_id;
  END IF;

  -- Update onboarding record
  UPDATE onboarding SET 
    completed = true,
    completed_at = TIMEZONE('utc'::text, NOW()),
    current_step = 'completed'
  WHERE user_id = user_id;

  RETURN venue_profile_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A venue with the name "%" already exists for this user', venue_name;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create venue account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SAFE INDEXES - Only for columns that exist
-- =============================================================================

-- Basic indexes that should always work
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding(completed);

-- Conditional indexes for existing tables
DO $$
BEGIN
  -- Profiles indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  END IF;
  
  -- Artist profiles indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'artist_name') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_profiles_name ON artist_profiles(artist_name);
    END IF;
  END IF;
  
  -- Venue profiles indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'venue_name') THEN
      CREATE INDEX IF NOT EXISTS idx_venue_profiles_name ON venue_profiles(venue_name);
    END IF;
  END IF;
  
  RAISE NOTICE 'Created safe indexes for existing columns';
END $$;

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'SAFE AUTH SETUP COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '- user_sessions (session management)';
  RAISE NOTICE '- onboarding (user onboarding tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '- Automatic profile creation on signup';
  RAISE NOTICE '- Onboarding flow tracking';
  RAISE NOTICE '- Safe account creation functions';
  RAISE NOTICE '- Row Level Security policies';
  RAISE NOTICE '- Conditional indexes (only for existing columns)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run quick_fix_missing_columns.sql to add missing columns';
  RAISE NOTICE 'Your login/signup flow foundation is ready!';
  RAISE NOTICE '==================================================';
END $$; 