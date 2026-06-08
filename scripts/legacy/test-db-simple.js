#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auqddrodjezjlypkzfpi.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseSimple() {
  console.log('🔍 Testing Database Tables and Data...\n')
  
  try {
    // 1. Test profiles table
    console.log('1. Testing profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, full_name, onboarding_completed')
      .limit(3)
    
    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError.message)
    } else {
      console.log(`✅ Profiles table accessible. Found ${profiles.length} sample records:`)
      profiles.forEach((profile, index) => {
        console.log(`   Profile ${index + 1}:`, {
          id: profile.id?.substring(0, 8) + '...',
          name: profile.name || 'null',
          username: profile.username || 'null', 
          full_name: profile.full_name || 'null',
          onboarding_completed: profile.onboarding_completed
        })
      })
    }
    
    // 2. Test artist_profiles table
    console.log('\n2. Testing artist_profiles table...')
    const { data: artistProfiles, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name, verification_status')
      .limit(3)
    
    if (artistError) {
      console.error('❌ Error querying artist_profiles:', artistError.message)
    } else {
      console.log(`✅ Artist profiles table accessible. Found ${artistProfiles.length} records`)
      artistProfiles.forEach((artist, index) => {
        console.log(`   Artist ${index + 1}:`, {
          artist_name: artist.artist_name || 'null',
          verification_status: artist.verification_status || 'null'
        })
      })
    }
    
    // 3. Test venue_profiles table
    console.log('\n3. Testing venue_profiles table...')
    const { data: venueProfiles, error: venueError } = await supabase
      .from('venue_profiles')
      .select('id, user_id, venue_name, verification_status')
      .limit(3)
    
    if (venueError) {
      console.error('❌ Error querying venue_profiles:', venueError.message)
    } else {
      console.log(`✅ Venue profiles table accessible. Found ${venueProfiles.length} records`)
      venueProfiles.forEach((venue, index) => {
        console.log(`   Venue ${index + 1}:`, {
          venue_name: venue.venue_name || 'null',
          verification_status: venue.verification_status || 'null'
        })
      })
    }
    
    // 4. Test onboarding table
    console.log('\n4. Testing onboarding table...')
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding')
      .select('user_id, completed, general_profile_completed, artist_profile_completed')
      .limit(3)
    
    if (onboardingError) {
      console.error('❌ Error querying onboarding:', onboardingError.message)
    } else {
      console.log(`✅ Onboarding table accessible. Found ${onboarding.length} records`)
      onboarding.forEach((record, index) => {
        console.log(`   Record ${index + 1}:`, {
          completed: record.completed,
          general_completed: record.general_profile_completed,
          artist_completed: record.artist_profile_completed
        })
      })
    }
    
    // 5. Test if we can create a test user (simulate signup)
    console.log('\n5. Testing auth user creation simulation...')
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testpassword123'
    
    console.log(`📝 Attempting to create test user with email: ${testEmail}`)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: 'testuser' + Date.now(),
          account_type: 'general'
        }
      }
    })
    
    if (authError) {
      console.error('❌ Error creating test user:', authError.message)
    } else {
      console.log('✅ Test user creation initiated')
      console.log('   User ID:', authData.user?.id?.substring(0, 8) + '...')
      console.log('   Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No')
      console.log('   Session created:', !!authData.session)
      
      // Check if profile was automatically created
      if (authData.user?.id) {
        setTimeout(async () => {
          console.log('\n6. Checking if profile was auto-created...')
          const { data: newProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single()
          
          if (profileCheckError) {
            console.error('❌ Profile auto-creation failed:', profileCheckError.message)
          } else {
            console.log('✅ Profile auto-created successfully!')
            console.log('   Profile data:', {
              name: newProfile.name || 'null',
              username: newProfile.username || 'null',
              full_name: newProfile.full_name || 'null',
              onboarding_completed: newProfile.onboarding_completed
            })
          }
          
          // Clean up test user
          console.log('\n7. Cleaning up test user...')
          await supabase.auth.admin.deleteUser(authData.user.id)
          console.log('✅ Test user cleaned up')
        }, 2000) // Wait 2 seconds for trigger to complete
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testDatabaseSimple()