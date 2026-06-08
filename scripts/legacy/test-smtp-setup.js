#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSMTPSetup() {
  console.log('📧 Testing SMTP Configuration...\n')
  
  try {
    // Test 1: Try password reset (uses SMTP)
    console.log('1. Testing SMTP with password reset email...')
    
    const testEmail = 'test@example.com' // Use a real email you can check
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail)
    
    if (resetError) {
      console.error('❌ Password reset email failed:', resetError.message)
      
      if (resetError.message.includes('SMTP') || resetError.message.includes('email')) {
        console.log('\n💡 SMTP Configuration Issues:')
        console.log('   - Check SMTP settings in Supabase Dashboard')
        console.log('   - Verify SMTP credentials are correct')
        console.log('   - Ensure sender email is valid')
      }
    } else {
      console.log('✅ Password reset email sent successfully!')
      console.log('   Check your email inbox for the reset link')
      console.log('   This means SMTP is working!')
    }
    
    // Test 2: Try actual signup (should work now)
    console.log('\n2. Testing signup with SMTP configured...')
    
    const signupEmail = `smtp-test-${Date.now()}@example.com`
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: signupEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'SMTP Test User',
          username: 'smtptest'
        }
      }
    })
    
    if (signupError) {
      if (signupError.message === 'Database error saving new user') {
        console.error('❌ Still getting database error - SMTP might not be the full issue')
        console.log('   Additional troubleshooting needed')
      } else {
        console.error('❌ Signup failed:', signupError.message)
      }
    } else {
      console.log('✅ SIGNUP SUCCESSFUL!')
      console.log('   User ID:', signupData.user?.id)
      console.log('   Email confirmation required:', !signupData.session)
      
      if (signupData.user?.id) {
        // Clean up test user
        setTimeout(async () => {
          await supabase.auth.admin.deleteUser(signupData.user.id)
          console.log('✅ Test user cleaned up')
        }, 2000)
      }
    }
    
    // Test 3: Check email templates
    console.log('\n3. Checking email template configuration...')
    console.log('📋 Verify in Supabase Dashboard → Authentication → Email Templates:')
    console.log('   - Confirm signup template is enabled')
    console.log('   - Check template formatting')
    console.log('   - Verify redirect URLs are correct')
    
  } catch (error) {
    console.error('❌ SMTP test error:', error.message)
  }
}

testSMTPSetup()