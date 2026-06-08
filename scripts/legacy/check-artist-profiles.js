#!/usr/bin/env node

/**
 * Check Artist Profiles
 * 
 * This script checks all artist profiles to understand the data structure.
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

async function checkArtistProfiles() {
  console.log('🔍 Checking All Artist Profiles...\n')

  try {
    // Step 1: Get all artist profiles
    console.log('1. Getting all artist profiles...')
    const { data: artistProfiles, error: artistError } = await supabase
      .from('artist_profiles')
      .select('*')

    if (artistError) {
      console.error('❌ Error fetching artist profiles:', artistError.message)
      return
    }

    console.log(`✅ Found ${artistProfiles.length} artist profiles:`)
    artistProfiles.forEach((profile, index) => {
      console.log(`\n   Artist Profile ${index + 1}:`)
      console.log(`   ID: ${profile.id}`)
      console.log(`   User ID: ${profile.user_id}`)
      console.log(`   Artist Name: "${profile.artist_name}"`)
      console.log(`   Stage Name: "${profile.stage_name}"`)
      console.log(`   Bio: "${profile.bio}"`)
      console.log(`   Genres: ${JSON.stringify(profile.genres)}`)
    })

    // Step 2: Check which one belongs to Kyle
    console.log('\n2. Finding Kyle\'s artist profile...')
    const kyleArtistProfile = artistProfiles.find(profile => 
      profile.user_id === '97b9e178-b65f-47a3-910e-550864a4568a'
    )

    if (kyleArtistProfile) {
      console.log('✅ Found Kyle\'s artist profile:')
      console.log(`   Artist Name: "${kyleArtistProfile.artist_name}"`)
      console.log(`   Stage Name: "${kyleArtistProfile.stage_name}"`)
      
      if (kyleArtistProfile.artist_name === 'Felix') {
        console.log('\n❌ PROBLEM: Kyle\'s artist profile has artist_name = "Felix"')
        console.log('   This is why the profile shows Felix instead of Kyle!')
        
        // Fix it
        console.log('\n3. Fixing Kyle\'s artist profile...')
        const { error: updateError } = await supabase
          .from('artist_profiles')
          .update({
            artist_name: 'Kyle',
            stage_name: 'Kyle'
          })
          .eq('id', kyleArtistProfile.id)

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
    } else {
      console.log('❌ Kyle does not have an artist profile')
    }

    // Step 3: Check for any profiles with "Felix" data
    console.log('\n4. Checking for any profiles with "Felix" data...')
    const felixProfiles = artistProfiles.filter(profile => 
      profile.artist_name === 'Felix' || profile.stage_name === 'Felix'
    )

    if (felixProfiles.length > 0) {
      console.log(`⚠️  Found ${felixProfiles.length} profiles with "Felix" data:`)
      felixProfiles.forEach(profile => {
        console.log(`   - User ID: ${profile.user_id}, Artist: "${profile.artist_name}", Stage: "${profile.stage_name}"`)
      })
    } else {
      console.log('✅ No profiles found with "Felix" data')
    }

    console.log('\n🎉 Artist profiles check completed!')

  } catch (error) {
    console.error('💥 Test script error:', error)
  }
}

checkArtistProfiles()



