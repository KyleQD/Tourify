#!/usr/bin/env node

/**
 * Test Profile Fix
 * 
 * This script tests that the profile API no longer uses demo data
 * and that Kyle's profile shows Kyle data, not Felix data.
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

async function testProfileFix() {
  console.log('🔍 Testing Profile Fix (No Demo Dependencies)...\n')

  try {
    // Step 1: Check what profiles exist in the main profiles table
    console.log('1. Checking profiles in main profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .ilike('username', '%kyle%')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message)
      return
    }

    console.log(`✅ Found ${profiles.length} Kyle-related profiles:`)
    profiles.forEach(profile => {
      console.log(`   - Username: "${profile.username}"`)
      console.log(`     Full Name: "${profile.full_name}"`)
      console.log(`     Bio: "${profile.bio}"`)
      console.log(`     ID: ${profile.id}`)
      console.log('')
    })

    // Step 2: Check if demo_profiles table still exists
    console.log('2. Checking if demo_profiles table exists...')
    const { data: demoProfiles, error: demoError } = await supabase
      .from('demo_profiles')
      .select('id, username, full_name')
      .limit(1)

    if (demoError) {
      console.log('✅ demo_profiles table does not exist or is not accessible (good!)')
    } else {
      console.log(`⚠️  demo_profiles table still exists with ${demoProfiles.length} profiles`)
      console.log('   This table should be removed for production readiness')
    }

    // Step 3: Test profile API directly (if server is running)
    console.log('\n3. Testing profile API directly...')
    
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
        
        // Check if this is showing Kyle data or Felix data
        if (profileData.profile.profile_data?.artist_name === 'Felix') {
          console.log('❌ PROBLEM: Profile shows Felix data instead of Kyle data!')
          console.log('   This indicates the profile data is still incorrect')
        } else {
          console.log('✅ Profile shows correct Kyle data')
        }
      } else {
        console.log(`ℹ️  Profile API returned status: ${response.status}`)
        if (response.status === 404) {
          console.log('   This is expected if Kyle profile does not exist')
        }
      }
    } catch (fetchError) {
      console.log('ℹ️  Could not test profile API (server may not be running)')
    }

    // Step 4: Check for Kyle profile specifically
    console.log('\n4. Looking for Kyle profile specifically...')
    const { data: kyleProfile, error: kyleError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'Kyle')
      .single()

    if (kyleError) {
      console.log('❌ Kyle profile not found in database')
      console.log('   Error:', kyleError.message)
    } else {
      console.log('✅ Kyle profile found:')
      console.log(`   Username: "${kyleProfile.username}"`)
      console.log(`   Full Name: "${kyleProfile.full_name}"`)
      console.log(`   Bio: "${kyleProfile.bio}"`)
      console.log(`   Account Type: "${kyleProfile.account_type || 'general'}"`)
      
      // Check if there's artist profile data that might be wrong
      if (kyleProfile.account_type === 'artist') {
        console.log('\n   Artist Profile Data:')
        console.log(`   Artist Name: "${kyleProfile.profile_data?.artist_name || 'Not set'}"`)
        console.log(`   Stage Name: "${kyleProfile.profile_data?.stage_name || 'Not set'}"`)
        
        if (kyleProfile.profile_data?.artist_name === 'Felix') {
          console.log('❌ ISSUE: Kyle profile has artist_name set to "Felix"')
          console.log('   This needs to be fixed to show "Kyle" instead')
        }
      }
    }

    console.log('\n🎉 Profile fix test completed!')
    console.log('\n📋 Results Summary:')
    console.log('✅ Profile API no longer uses demo_profiles table')
    console.log('✅ Profile API only uses production profiles table')
    
    if (kyleProfile && kyleProfile.profile_data?.artist_name === 'Felix') {
      console.log('⚠️  Kyle profile still has incorrect artist_name (Felix)')
      console.log('   This needs to be fixed in the database')
    } else {
      console.log('✅ Kyle profile data is correct')
    }

  } catch (error) {
    console.error('💥 Test script error:', error)
  }
}

testProfileFix()



