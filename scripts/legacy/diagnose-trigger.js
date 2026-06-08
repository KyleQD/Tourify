#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseTrigger() {
  console.log('🔍 Diagnosing Trigger Function Issues...\n')
  
  try {
    // 1. Check if profiles table has the required columns
    console.log('1. Testing profiles table structure...')
    
    const testUserId = '12345678-1234-1234-1234-123456789012' // Valid UUID format
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          name: 'Test Name',
          username: 'testuser123',
          full_name: 'Test Full Name', 
          onboarding_completed: false
        })
        .select()
      
      if (error) {
        console.error('❌ Profiles table insert failed:', error.message)
        console.log('   This might be the issue - missing columns or constraints')
      } else {
        console.log('✅ Profiles table insert works')
        
        // Clean up
        await supabase.from('profiles').delete().eq('id', testUserId)
      }
    } catch (err) {
      console.error('❌ Profiles table error:', err.message)
    }
    
    // 2. Check user_active_profiles table
    console.log('\n2. Testing user_active_profiles table...')
    
    try {
      const { data, error } = await supabase
        .from('user_active_profiles')
        .insert({
          user_id: testUserId,
          active_profile_type: 'general'
        })
        .select()
      
      if (error) {
        console.error('❌ user_active_profiles insert failed:', error.message)
      } else {
        console.log('✅ user_active_profiles table insert works')
        
        // Clean up
        await supabase.from('user_active_profiles').delete().eq('user_id', testUserId)
      }
    } catch (err) {
      console.error('❌ user_active_profiles error:', err.message)
    }
    
    // 3. Check what columns actually exist in profiles
    console.log('\n3. Checking actual profiles table structure...')
    
    try {
      const { data: sampleProfile, error: sampleError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('❌ Error querying profiles:', sampleError.message)
      } else if (sampleProfile && sampleProfile.length > 0) {
        console.log('✅ Sample profile structure:')
        console.log('   Available columns:', Object.keys(sampleProfile[0]))
      } else {
        console.log('⚠️  No profiles found to check structure')
      }
    } catch (err) {
      console.error('❌ Error checking structure:', err.message)
    }
    
    // 4. Try a very simple signup to see exact error
    console.log('\n4. Testing minimal auth user creation...')
    
    const testEmail = `minimal-test-${Date.now()}@example.com`
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Minimal Test',
            username: 'minimaltest'
          }
        }
      })
      
      if (authError) {
        console.error('❌ Auth signup failed:', authError.message)
        console.error('   Status:', authError.status)
        console.error('   Code:', authError.code)
        
        // This might give us more specific error info
        if (authError.message.includes('function') || authError.message.includes('trigger')) {
          console.log('\n💡 This looks like a trigger function error!')
          console.log('   The trigger might be failing due to:')
          console.log('   - Missing columns in profiles table')
          console.log('   - Wrong data types')
          console.log('   - Constraint violations')
        }
      } else {
        console.log('✅ Auth signup succeeded!')
        console.log('   User ID:', authData.user?.id)
        
        // Clean up
        if (authData.user?.id) {
          setTimeout(async () => {
            await supabase.auth.admin.deleteUser(authData.user.id)
            console.log('✅ Test user cleaned up')
          }, 1000)
        }
      }
    } catch (err) {
      console.error('❌ Unexpected auth error:', err.message)
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message)
  }
}

diagnoseTrigger()