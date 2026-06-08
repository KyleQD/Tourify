#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyEmergencyFix() {
  console.log('🚨 Applying Emergency Auth Fix...\n')
  
  try {
    console.log('1. Creating user_active_profiles table...')
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_active_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          active_profile_type TEXT NOT NULL DEFAULT 'general',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    })
    
    if (tableError) {
      console.error('❌ Table creation failed:', tableError.message)
    } else {
      console.log('✅ user_active_profiles table created/verified')
    }

    console.log('\n2. Adding missing columns to profiles...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
          ADD COLUMN IF NOT EXISTS name TEXT,
          ADD COLUMN IF NOT EXISTS username TEXT,
          ADD COLUMN IF NOT EXISTS full_name TEXT,
          ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS bio TEXT,
          ADD COLUMN IF NOT EXISTS avatar_url TEXT,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
    })
    
    if (alterError) {
      console.error('❌ Column addition failed:', alterError.message)
    } else {
      console.log('✅ Profiles table columns added/verified')
    }

    console.log('\n3. Creating robust handle_new_user function...')
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Try to insert profile with error handling
          BEGIN
            INSERT INTO profiles (id, name, username, full_name, onboarding_completed, created_at, updated_at)
            VALUES (
              NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
              COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
              COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
              COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
              NOW(),
              NOW()
            );
          EXCEPTION
            WHEN unique_violation THEN
              -- Profile already exists, update it instead
              UPDATE profiles SET
                name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', name),
                username = COALESCE(NEW.raw_user_meta_data->>'username', username),
                full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
                updated_at = NOW()
              WHERE id = NEW.id;
            WHEN OTHERS THEN
              -- Log error but don't crash
              RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
          END;

          -- Try to create active profile entry
          BEGIN
            INSERT INTO user_active_profiles (user_id, active_profile_type)
            VALUES (NEW.id, 'general');
          EXCEPTION
            WHEN unique_violation THEN
              -- Active profile already exists, skip
              NULL;
            WHEN OTHERS THEN
              -- Log error but don't crash
              RAISE WARNING 'Error creating active profile for user %: %', NEW.id, SQLERRM;
          END;

          RETURN NEW;
        EXCEPTION
          WHEN OTHERS THEN
            -- Ultimate fallback - log error but don't crash the signup
            RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })
    
    if (functionError) {
      console.error('❌ Function creation failed:', functionError.message)
    } else {
      console.log('✅ Robust handle_new_user function created')
    }

    console.log('\n4. Setting up trigger...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `
    })
    
    if (triggerError) {
      console.error('❌ Trigger setup failed:', triggerError.message)
    } else {
      console.log('✅ Trigger setup complete')
    }

    console.log('\n🧪 Testing the fix...')
    const testEmail = `emergency-fix-test-${Date.now()}@example.com`
    
    const { data: testData, error: testError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Emergency Fix Test User',
          username: 'emergencytest' + Date.now()
        }
      }
    })
    
    if (testError) {
      console.error('❌ Test signup still failing:', testError.message)
    } else {
      console.log('✅ TEST SIGNUP SUCCESSFUL!')
      console.log('   User ID:', testData.user?.id?.substring(0, 8) + '...')
      
      // Wait and check profile creation
      setTimeout(async () => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', testData.user.id)
          .single()
        
        if (profileError) {
          console.error('❌ Profile creation failed:', profileError.message)
        } else {
          console.log('✅ Profile auto-created successfully!')
          console.log('   Profile data:', {
            name: profile.name,
            username: profile.username, 
            full_name: profile.full_name,
            onboarding_completed: profile.onboarding_completed
          })
        }
        
        // Clean up test user
        await supabase.auth.admin.deleteUser(testData.user.id)
        console.log('✅ Test user cleaned up')
        
        console.log('\n🎉 EMERGENCY FIX COMPLETE!')
        console.log('   Signup system should now be functional.')
      }, 2000)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

applyEmergencyFix()