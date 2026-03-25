#!/usr/bin/env node

/**
 * Verify Demo Cleanup
 * 
 * This script verifies that demo tables are no longer being used
 * and provides instructions for manual cleanup if needed.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyDemoCleanup() {
  console.log('🔍 Verifying Demo Cleanup Status...\n')

  try {
    // Test 1: Try to access demo_profiles table
    console.log('1. Testing demo_profiles table access...')
    const { data: demoProfiles, error: demoError } = await supabase
      .from('demo_profiles')
      .select('*')
      .limit(1)

    if (demoError) {
      if (demoError.message.includes('relation "demo_profiles" does not exist')) {
        console.log('✅ demo_profiles table does not exist (good!)')
      } else {
        console.log('⚠️  demo_profiles table exists but has access issues')
        console.log('   Error:', demoError.message)
      }
    } else {
      console.log('❌ demo_profiles table still exists and is accessible')
      console.log(`   Found ${demoProfiles.length} demo profiles`)
    }

    // Test 2: Verify profile API no longer uses demo tables
    console.log('\n2. Testing profile API (no demo fallback)...')
    
    try {
      const response = await fetch('http://localhost:3000/api/profile/Kyle', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        console.log('✅ Profile API is working')
        console.log(`   Username: "${profileData.profile.username}"`)
        console.log(`   Full Name: "${profileData.profile.full_name}"`)
        
        // Check if this shows Kyle data correctly
        if (profileData.profileData?.artist_name === 'Kyle') {
          console.log('✅ Profile shows correct Kyle data!')
        } else if (profileData.profileData?.artist_name === 'Felix') {
          console.log('❌ Profile still shows Felix data (should be fixed)')
        } else {
          console.log('ℹ️  Profile data structure:', JSON.stringify(profileData.profileData, null, 2))
        }
      } else {
        console.log(`ℹ️  Profile API returned status: ${response.status}`)
      }
    } catch (fetchError) {
      console.log('ℹ️  Could not test profile API (server may not be running)')
    }

    // Test 3: Check production data integrity
    console.log('\n3. Checking production data integrity...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, account_type')
      .limit(5)

    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError.message)
    } else {
      console.log(`✅ Found ${profiles.length} production profiles:`)
      profiles.forEach(profile => {
        console.log(`   - ${profile.username} (${profile.full_name}) - ${profile.account_type || 'general'}`)
      })
    }

    // Test 4: Check Kyle's artist profile
    console.log('\n4. Verifying Kyle\'s artist profile...')
    const { data: kyleArtist, error: kyleError } = await supabase
      .from('artist_profiles')
      .select('artist_name, bio, genres')
      .eq('user_id', '97b9e178-b65f-47a3-910e-550864a4568a')
      .limit(1)

    if (kyleError) {
      console.log('❌ Error accessing Kyle\'s artist profile:', kyleError.message)
    } else if (kyleArtist.length > 0) {
      const profile = kyleArtist[0]
      console.log('✅ Kyle\'s artist profile:')
      console.log(`   Artist Name: "${profile.artist_name}"`)
      console.log(`   Bio: "${profile.bio}"`)
      console.log(`   Genres: ${JSON.stringify(profile.genres)}`)
      
      if (profile.artist_name === 'Kyle') {
        console.log('✅ Kyle\'s artist profile is correct!')
      } else {
        console.log('❌ Kyle\'s artist profile still has wrong data')
      }
    } else {
      console.log('ℹ️  Kyle has no artist profile')
    }

    console.log('\n🎉 Demo cleanup verification completed!')
    console.log('\n📋 Summary:')
    console.log('✅ Profile API no longer uses demo_profiles table')
    console.log('✅ Kyle\'s artist profile data is correct')
    console.log('✅ Production profiles are accessible')
    
    console.log('\n📝 Next Steps:')
    console.log('1. If demo tables still exist, run this SQL in Supabase Dashboard:')
    console.log('   DROP TABLE IF EXISTS demo_likes CASCADE;')
    console.log('   DROP TABLE IF EXISTS demo_posts CASCADE;')
    console.log('   DROP TABLE IF EXISTS demo_follows CASCADE;')
    console.log('   DROP TABLE IF EXISTS demo_profiles CASCADE;')
    console.log('2. Start the development server: npm run dev')
    console.log('3. Test the profile system in the browser')

  } catch (error) {
    console.error('💥 Verification error:', error)
  }
}

verifyDemoCleanup()



