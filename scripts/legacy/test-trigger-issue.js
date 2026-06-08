#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTriggerIssue() {
  console.log('🔍 Testing Database Tables Required by Trigger...\n')
  
  try {
    // 1. Check if profiles table structure matches what trigger expects
    console.log('1. Testing profiles table structure...')
    const { data: testProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, username, full_name, onboarding_completed')
      .limit(1)
    
    if (profileError) {
      console.error('❌ Profiles table issue:', profileError.message)
    } else {
      console.log('✅ Profiles table structure looks correct')
    }
    
    // 2. Check if user_active_profiles table exists
    console.log('\n2. Testing user_active_profiles table...')
    const { data: activeProfiles, error: activeError } = await supabase
      .from('user_active_profiles')
      .select('user_id, active_profile_type')
      .limit(1)
    
    if (activeError) {
      console.error('❌ user_active_profiles table issue:', activeError.message)
      console.log('   This is likely the cause of the trigger failure!')
    } else {
      console.log('✅ user_active_profiles table exists')
      console.log('   Sample data:', activeProfiles)
    }
    
    // 3. Try to manually insert test data to see exact error
    console.log('\n3. Testing manual insert into profiles...')
    const testUserId = 'test-' + Date.now() + '-0000-0000-000000000000'
    
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        name: 'Test Name',
        username: 'testuser',
        full_name: 'Test Full Name',
        onboarding_completed: false
      })
      .select()
    
    if (insertError) {
      console.error('❌ Manual profiles insert failed:', insertError.message)
    } else {
      console.log('✅ Manual profiles insert succeeded')
      
      // Try user_active_profiles insert
      console.log('\n4. Testing manual insert into user_active_profiles...')
      const { data: activeInsert, error: activeInsertError } = await supabase
        .from('user_active_profiles')
        .insert({
          user_id: testUserId,
          active_profile_type: 'general'
        })
        .select()
      
      if (activeInsertError) {
        console.error('❌ Manual user_active_profiles insert failed:', activeInsertError.message)
        console.log('   This confirms the trigger failure cause!')
      } else {
        console.log('✅ Manual user_active_profiles insert succeeded')
      }
      
      // Clean up
      await supabase.from('user_active_profiles').delete().eq('user_id', testUserId)
      await supabase.from('profiles').delete().eq('id', testUserId)
      console.log('✅ Test data cleaned up')
    }
    
    // 4. Check if there are any columns that don't exist
    console.log('\n5. Checking for missing columns in profiles...')
    try {
      const { data: fullTest, error: fullError } = await supabase
        .from('profiles')
        .select('id, name, username, full_name, onboarding_completed, bio, avatar_url, email, created_at, updated_at')
        .limit(1)
      
      if (fullError) {
        console.error('❌ Some columns missing in profiles:', fullError.message)
      } else {
        console.log('✅ All expected columns exist in profiles')
      }
    } catch (err) {
      console.error('❌ Error checking columns:', err.message)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testTriggerIssue()