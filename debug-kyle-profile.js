#!/usr/bin/env node

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

async function debugKyleProfile() {
  console.log('🔍 Debugging Kyle Profile Issue...\n')

  try {
    // Check main profiles table for "Kyle"
    console.log('1. Checking main profiles table for "Kyle":')
    const { data: mainProfiles, error: mainError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .ilike('username', '%kyle%')

    if (mainError) {
      console.error('❌ Error querying main profiles:', mainError.message)
    } else {
      console.log('✅ Main profiles found:', mainProfiles?.length || 0)
      mainProfiles?.forEach(profile => {
        console.log(`   - ID: ${profile.id}, Username: "${profile.username}", Name: "${profile.full_name}"`)
      })
    }

    // Check demo_profiles table for "Kyle"
    console.log('\n2. Checking demo_profiles table for "Kyle":')
    const { data: demoProfiles, error: demoError } = await supabase
      .from('demo_profiles')
      .select('id, username, full_name, bio, avatar_url')
      .ilike('username', '%kyle%')

    if (demoError) {
      console.error('❌ Error querying demo profiles:', demoError.message)
    } else {
      console.log('✅ Demo profiles found:', demoProfiles?.length || 0)
      demoProfiles?.forEach(profile => {
        console.log(`   - ID: ${profile.id}, Username: "${profile.username}", Name: "${profile.full_name}"`)
      })
    }

    // Check for exact "Kyle" username match
    console.log('\n3. Checking for exact "Kyle" username match:')
    const { data: exactKyle, error: exactError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('username', 'Kyle')
      .single()

    if (exactError) {
      console.log('❌ No exact "Kyle" match in profiles table:', exactError.message)
    } else {
      console.log('✅ Exact "Kyle" match found:', exactKyle)
    }

    // Check demo_profiles for exact "Kyle" match
    const { data: exactKyleDemo, error: exactDemoError } = await supabase
      .from('demo_profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('username', 'Kyle')
      .single()

    if (exactDemoError) {
      console.log('❌ No exact "Kyle" match in demo_profiles table:', exactDemoError.message)
    } else {
      console.log('✅ Exact "Kyle" match found in demo:', exactKyleDemo)
    }

    // Check for Felix profiles
    console.log('\n4. Checking for "Felix" profiles:')
    const { data: felixProfiles, error: felixError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .ilike('username', '%felix%')

    if (felixError) {
      console.error('❌ Error querying Felix profiles:', felixError.message)
    } else {
      console.log('✅ Felix profiles found:', felixProfiles?.length || 0)
      felixProfiles?.forEach(profile => {
        console.log(`   - ID: ${profile.id}, Username: "${profile.username}", Name: "${profile.full_name}"`)
      })
    }

    // Check demo_profiles for Felix
    const { data: felixDemoProfiles, error: felixDemoError } = await supabase
      .from('demo_profiles')
      .select('id, username, full_name, bio, avatar_url')
      .ilike('username', '%felix%')

    if (felixDemoError) {
      console.error('❌ Error querying Felix demo profiles:', felixDemoError.message)
    } else {
      console.log('✅ Felix demo profiles found:', felixDemoProfiles?.length || 0)
      felixDemoProfiles?.forEach(profile => {
        console.log(`   - ID: ${profile.id}, Username: "${profile.username}", Name: "${profile.full_name}"`)
      })
    }

    // Check your current user profile
    console.log('\n5. Checking current authenticated user profile:')
    const currentUserId = '6b6ce8d8-d733-46e3-8262-193ae8a39b86' // From your logs
    const { data: currentUser, error: currentError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('id', currentUserId)
      .single()

    if (currentError) {
      console.log('❌ Current user profile not found:', currentError.message)
    } else {
      console.log('✅ Current user profile:', currentUser)
    }

  } catch (error) {
    console.error('💥 Debug script error:', error)
  }
}

debugKyleProfile()



