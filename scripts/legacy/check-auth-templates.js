#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuthTemplates() {
  console.log('📧 Checking Auth Configuration Beyond SMTP...\n')
  
  try {
    // Test with different signup configurations
    console.log('1. Testing signup with minimal data...')
    
    const minimalEmail = `minimal-${Date.now()}@example.com`
    
    const { data: minimalData, error: minimalError } = await supabase.auth.signUp({
      email: minimalEmail,
      password: 'TestPassword123!'
      // No metadata - see if this works
    })
    
    if (minimalError) {
      console.error('❌ Minimal signup failed:', minimalError.message)
      if (minimalError.message.includes('template') || minimalError.message.includes('email')) {
        console.log('   💡 This suggests email template issues')
      }
    } else {
      console.log('✅ Minimal signup succeeded!')
      console.log('   This means the issue is with metadata or templates')
      
      // Clean up
      if (minimalData.user?.id) {
        setTimeout(async () => {
          await supabase.auth.admin.deleteUser(minimalData.user.id)
          console.log('✅ Minimal test user cleaned up')
        }, 1000)
      }
    }
    
    // Test 2: Check if we can create users with email confirmation disabled
    console.log('\n2. Checking auth settings recommendations...')
    console.log('📋 In Supabase Dashboard → Authentication → Settings:')
    console.log('')
    console.log('   A. Email Confirmation:')
    console.log('      - Try temporarily DISABLING "Enable email confirmations"')
    console.log('      - This will bypass email template issues')
    console.log('')
    console.log('   B. Site URL:')
    console.log('      - Should be: http://localhost:3000')
    console.log('      - Check for typos or wrong protocol')
    console.log('')
    console.log('   C. Redirect URLs:')
    console.log('      - Should include: http://localhost:3000/**')
    console.log('      - Or specific: http://localhost:3000/auth/callback')
    console.log('')
    console.log('   D. Email Templates → Confirm signup:')
    console.log('      - Check if template is enabled')
    console.log('      - Try "Reset to default"')
    console.log('      - Verify redirect URL syntax')
    
    // Test 3: Check for any rate limiting
    console.log('\n3. Testing for rate limiting...')
    
    // Try multiple signups quickly to see if rate limiting is the issue
    for (let i = 0; i < 3; i++) {
      const testEmail = `rate-test-${Date.now()}-${i}@example.com`
      
      const { error: rateError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!'
      })
      
      if (rateError && rateError.message.includes('rate')) {
        console.log(`❌ Rate limiting detected on attempt ${i + 1}`)
        break
      } else if (rateError) {
        console.log(`❌ Same error on attempt ${i + 1}: ${rateError.message}`)
      } else {
        console.log(`✅ Attempt ${i + 1} succeeded`)
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('\n🎯 RECOMMENDED NEXT STEPS:')
    console.log('1. FIRST: Try disabling email confirmations temporarily')
    console.log('2. If that works: Reset email templates to default')
    console.log('3. If still fails: Check Supabase project status/billing')
    console.log('4. Last resort: Contact Supabase Support')
    
  } catch (error) {
    console.error('❌ Auth template check error:', error.message)
  }
}

checkAuthTemplates()