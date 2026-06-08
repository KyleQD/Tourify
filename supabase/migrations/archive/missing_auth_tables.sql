-- Missing Auth Tables for Tourify Login/Signup Flow
-- This SQL adds all missing tables and configurations for smooth authentication

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PROFILES TABLE (Enhanced with onboarding support)
-- =============================================================================

-- Create or enhance profiles table
DO $$ 
BEGIN
  -- Create profiles table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      website TEXT,
      location TEXT,
      birth_date DATE,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'artist', 'venue', 'admin')),
      is_verified BOOLEAN DEFAULT false,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      onboarding_completed BOOLEAN DEFAULT false,
      account_settings JSONB DEFAULT '{
        "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
        "notifications": {"email": true, "push": true, "sms": false},
        "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
      }'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
    RAISE NOTICE 'Created profiles table';
  END IF;

  -- Add missing columns to existing profiles table
  BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_settings JSONB DEFAULT '{
      "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
      "notifications": {"email": true, "push": true, "sms": false},
      "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
    }'::jsonb;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
    
    -- Add check constraint for role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'profiles_role_check') THEN
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'artist', 'venue', 'admin'));
    END IF;
  EXCEPTION WHEN duplicate_column THEN
    -- Columns already exist, continue
    NULL;
  END;
END $$;

-- =============================================================================
-- ARTIST PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS artist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  bio TEXT,
  genres TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{
    "spotify": null,
    "apple_music": null,
    "youtube": null,
    "instagram": null,
    "tiktok": null,
    "twitter": null,
    "website": null
  }'::jsonb,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium')),
  settings JSONB DEFAULT '{
    "public_profile": true,
    "allow_bookings": true,
    "show_contact_info": false,
    "auto_accept_follows": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, artist_name)
);

-- =============================================================================
-- VENUE PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  capacity INTEGER,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{
    "phone": null,
    "email": null,
    "booking_email": null,
    "manager_name": null
  }'::jsonb,
  social_links JSONB DEFAULT '{
    "website": null,
    "instagram": null,
    "facebook": null,
    "twitter": null
  }'::jsonb,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium')),
  settings JSONB DEFAULT '{
    "public_profile": true,
    "allow_bookings": true,
    "show_contact_info": false,
    "require_approval": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, venue_name)
);

-- =============================================================================
-- AUTH SESSIONS TABLE (for better session management)
-- =============================================================================

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

-- =============================================================================
-- ONBOARDING TABLE (track onboarding progress)
-- =============================================================================

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
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Profiles policies
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

-- Artist profiles policies
DROP POLICY IF EXISTS "Users can view all artist profiles" ON artist_profiles;
DROP POLICY IF EXISTS "Users can manage their own artist profiles" ON artist_profiles;

CREATE POLICY "Users can view all artist profiles"
  ON artist_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own artist profiles"
  ON artist_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Venue profiles policies
DROP POLICY IF EXISTS "Users can view all venue profiles" ON venue_profiles;
DROP POLICY IF EXISTS "Users can manage their own venue profiles" ON venue_profiles;

CREATE POLICY "Users can view all venue profiles"
  ON venue_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own venue profiles"
  ON venue_profiles FOR ALL
  USING (auth.uid() = user_id);

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
-- TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_artist_profiles_updated_at ON artist_profiles;
DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON venue_profiles;
DROP TRIGGER IF EXISTS update_onboarding_updated_at ON onboarding;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON artist_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at
  BEFORE UPDATE ON venue_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
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

  -- Create artist profile
  INSERT INTO artist_profiles (user_id, main_profile_id, artist_name, bio, genres, social_links)
  VALUES (user_id, main_profile_id, artist_name, bio, genres, social_links)
  RETURNING id INTO artist_profile_id;

  -- Update profile role and onboarding status
  UPDATE profiles SET 
    role = 'artist',
    onboarding_completed = true 
  WHERE id = user_id;

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
  description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  capacity INTEGER DEFAULT NULL,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb
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

  -- Create venue profile
  INSERT INTO venue_profiles (
    user_id, main_profile_id, venue_name, description, address, 
    capacity, venue_types, contact_info, social_links
  )
  VALUES (
    user_id, main_profile_id, venue_name, description, address, 
    capacity, venue_types, contact_info, social_links
  )
  RETURNING id INTO venue_profile_id;

  -- Update profile role and onboarding status
  UPDATE profiles SET 
    role = 'venue',
    onboarding_completed = true 
  WHERE id = user_id;

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
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Artist profiles indexes
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_name ON artist_profiles(artist_name);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_verification ON artist_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_tier ON artist_profiles(account_tier);

-- Venue profiles indexes
CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_name ON venue_profiles(venue_name);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_verification ON venue_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_tier ON venue_profiles(account_tier);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_city ON venue_profiles(city);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Onboarding indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding(completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_step ON onboarding(current_step);

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
  RAISE NOTICE 'AUTH TABLES SETUP COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '- profiles (enhanced with onboarding)';
  RAISE NOTICE '- artist_profiles';
  RAISE NOTICE '- venue_profiles';
  RAISE NOTICE '- user_sessions';
  RAISE NOTICE '- onboarding';
  RAISE NOTICE '';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '- Automatic profile creation on signup';
  RAISE NOTICE '- Onboarding flow tracking';
  RAISE NOTICE '- Artist and venue account creation';
  RAISE NOTICE '- Session management';
  RAISE NOTICE '- Row Level Security policies';
  RAISE NOTICE '- Performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Your login/signup flow should now work smoothly!';
  RAISE NOTICE '==================================================';
END $$; 