#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found')
  process.exit(1)
}

// Use the client as a regular user would
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFrontendSignup() {
  console.log('🧪 Testing Frontend Signup Flow...\n')
  
  const testEmail = `frontend-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  
  try {
    console.log('1. Testing signup through Supabase client (as frontend would)...')
    console.log(`📧 Email: ${testEmail}`)
    console.log(`🔐 Password: ${testPassword}`)
    
    // Test 1: Basic signup (like /login page)
    console.log('\n🧪 Test 1: Basic signup (like /login page)')
    const { data: basicData, error: basicError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Frontend Test User',
          username: 'frontendtest' + Date.now()
        }
      }
    })
    
    if (basicError) {
      console.error('❌ Basic signup failed:', basicError.message)
      console.error('   Error details:', basicError)
    } else {
      console.log('✅ Basic signup succeeded!')
      console.log('   User ID:', basicData.user?.id?.substring(0, 8) + '...')
      console.log('   Email confirmed:', basicData.user?.email_confirmed_at ? 'Yes' : 'No')
      console.log('   Session created:', !!basicData.session)
      
      // Wait and check if profile was created
      if (basicData.user?.id) {
        console.log('\n⏳ Waiting 3 seconds for trigger to complete...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Switch to service role to check profile creation
        const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
        
        const { data: profile, error: profileError } = await serviceSupabase
          .from('profiles')
          .select('*')
          .eq('id', basicData.user.id)
          .single()
        
        if (profileError) {
          console.error('❌ Profile not created:', profileError.message)
        } else {
          console.log('✅ Profile created successfully!')
          console.log('   Profile data:', {
            name: profile.name,
            username: profile.username,
            full_name: profile.full_name,
            onboarding_completed: profile.onboarding_completed
          })
        }
        
        // Test onboarding table
        const { data: onboarding, error: onboardingError } = await serviceSupabase
          .from('onboarding')
          .select('*')
          .eq('user_id', basicData.user.id)
          .single()
        
        if (onboardingError) {
          console.error('❌ Onboarding record not created:', onboardingError.message)
        } else {
          console.log('✅ Onboarding record created!')
          console.log('   Onboarding data:', onboarding)
        }
        
        // Clean up
        console.log('\n🧹 Cleaning up test user...')
        await serviceSupabase.auth.admin.deleteUser(basicData.user.id)
        console.log('✅ Test user deleted')
      }
    }
    
    // Test 2: Enhanced signup (like /signup page)
    console.log('\n🧪 Test 2: Enhanced signup (like /signup page)')
    const testEmail2 = `enhanced-test-${Date.now()}@example.com`
    
    const { data: enhancedData, error: enhancedError } = await supabase.auth.signUp({
      email: testEmail2,
      password: testPassword,
      options: {
        data: {
          full_name: 'Enhanced Test User',
          username: 'enhancedtest' + Date.now(),
          account_type: 'artist',
          onboarding_completed: false
        }
      }
    })
    
    if (enhancedError) {
      console.error('❌ Enhanced signup failed:', enhancedError.message)
    } else {
      console.log('✅ Enhanced signup succeeded!')
      console.log('   User ID:', enhancedData.user?.id?.substring(0, 8) + '...')
      
      if (enhancedData.user?.id) {
        // Clean up immediately since we know it will work similarly
        const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
        setTimeout(async () => {
          await serviceSupabase.auth.admin.deleteUser(enhancedData.user.id)
          console.log('✅ Enhanced test user deleted')
        }, 1000)
      }
    }
    
    // Test 3: Check what happens with existing email
    console.log('\n🧪 Test 3: Testing duplicate email handling')
    const existingEmail = 'antonio@example.com' // Use an email we saw in the database
    
    const { data: dupData, error: dupError } = await supabase.auth.signUp({
      email: existingEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Duplicate Test',
          username: 'duplicate' + Date.now()
        }
      }
    })
    
    if (dupError) {
      console.log('✅ Duplicate email properly rejected:', dupError.message)
    } else {
      console.log('⚠️  Duplicate email was accepted (unexpected)')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during frontend testing:', error.message)
  }
}

testFrontendSignup()