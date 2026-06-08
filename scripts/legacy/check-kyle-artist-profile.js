#!/usr/bin/env node

/**
 * Check Kyle's Artist Profile
 * 
 * This script checks what's in Kyle's artist profile data
 * to understand why it shows Felix instead of Kyle.
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

async function checkKyleArtistProfile() {
  console.log('🔍 Checking Kyle\'s Artist Profile Data...\n')

  try {
    // Step 1: Get Kyle's main profile
    console.log('1. Getting Kyle\'s main profile...')
    const { data: kyleProfile, error: kyleError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'Kyle')
      .single()

    if (kyleError) {
      console.error('❌ Kyle profile not found:', kyleError.message)
      return
    }

    console.log('✅ Kyle\'s main profile:')
    console.log(`   ID: ${kyleProfile.id}`)
    console.log(`   Username: "${kyleProfile.username}"`)
    console.log(`   Full Name: "${kyleProfile.full_name}"`)
    console.log(`   Account Type: "${kyleProfile.account_type}"`)

    // Step 2: Check Kyle's artist profile
    console.log('\n2. Checking Kyle\'s artist profile...')
    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', kyleProfile.id)
      .single()

    if (artistError) {
      console.log('❌ Kyle has no artist profile')
      console.log('   Error:', artistError.message)
    } else {
      console.log('✅ Kyle\'s artist profile found:')
      console.log(`   Artist Name: "${artistProfile.artist_name}"`)
      console.log(`   Stage Name: "${artistProfile.stage_name}"`)
      console.log(`   Bio: "${artistProfile.bio}"`)
      console.log(`   Genres: ${JSON.stringify(artistProfile.genres)}`)
      console.log(`   Social Links: ${JSON.stringify(artistProfile.social_links)}`)
      
      // This is the problem!
      if (artistProfile.artist_name === 'Felix') {
        console.log('\n❌ PROBLEM FOUND: Kyle\'s artist profile has artist_name = "Felix"')
        console.log('   This is why the profile shows Felix instead of Kyle!')
        
        // Fix it
        console.log('\n3. Fixing Kyle\'s artist profile...')
        const { error: updateError } = await supabase
          .from('artist_profiles')
          .update({
            artist_name: 'Kyle',
            stage_name: 'Kyle'
          })
          .eq('user_id', kyleProfile.id)

        if (updateError) {
          console.error('❌ Error updating artist profile:', updateError.message)
        } else {
          console.log('✅ Kyle\'s artist profile updated successfully!')
          console.log('   artist_name changed from "Felix" to "Kyle"')
          console.log('   stage_name changed from "Felix" to "Kyle"')
        }
      } else {
        console.log('✅ Kyle\'s artist profile data is correct')
      }
    }

    // Step 3: Test the profile API now
    console.log('\n4. Testing profile API after fix...')
    try {
      const response = await fetch('http://localhost:3000/api/profile/Kyle', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        console.log('✅ Profile API response:')
        console.log(`   Username: "${profileData.profile.username}"`)
        console.log(`   Full Name: "${profileData.profile.full_name}"`)
        console.log(`   Artist Name: "${profileData.profileData?.artist_name || 'N/A'}"`)
        
        if (profileData.profileData?.artist_name === 'Kyle') {
          console.log('✅ SUCCESS: Profile now shows Kyle data correctly!')
        } else {
          console.log('⚠️  Profile data still not showing correctly')
        }
      } else {
        console.log(`ℹ️  Profile API returned status: ${response.status}`)
      }
    } catch (fetchError) {
      console.log('ℹ️  Could not test profile API (server may not be running)')
    }

    console.log('\n🎉 Kyle profile check completed!')

  } catch (error) {
    console.error('💥 Test script error:', error)
  }
}

checkKyleArtistProfile()



