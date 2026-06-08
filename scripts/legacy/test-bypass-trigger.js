#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBypassTrigger() {
  console.log('🧪 Testing Auth Without Trigger...\n')
  
  try {
    // First, let's temporarily disable the trigger and test
    console.log('1. Disabling trigger temporarily...')
    
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    })
    
    if (disableError && !disableError.message.includes('Could not find')) {
      console.log('⚠️  Could not disable trigger via RPC, will test differently')
    } else {
      console.log('✅ Trigger disabled (or already disabled)')
    }
    
    // Test signup without trigger
    console.log('\n2. Testing signup without trigger...')
    const testEmail = `no-trigger-test-${Date.now()}@example.com`
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'No Trigger Test',
          username: 'notriggertest'
        }
      }
    })
    
    if (authError) {
      console.error('❌ Signup still failing without trigger:', authError.message)
      console.log('   This means the issue is NOT with our trigger function!')
      console.log('   The issue is deeper in the Supabase auth system.')
    } else {
      console.log('✅ Signup succeeded without trigger!')
      console.log('   User ID:', authData.user?.id)
      console.log('   This confirms the trigger was the problem.')
      
      // Clean up
      if (authData.user?.id) {
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.log('✅ Test user deleted')
      }
    }
    
    // Re-enable trigger
    console.log('\n3. Re-enabling trigger...')
    const { error: enableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `
    })
    
    if (enableError && !enableError.message.includes('Could not find')) {
      console.log('⚠️  Could not re-enable trigger via RPC')
    } else {
      console.log('✅ Trigger re-enabled')
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
  
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Check Supabase Dashboard → Logs → Database logs')
  console.log('2. Look for "handle_new_user:" messages')
  console.log('3. Share any error messages you see in the logs')
}

testBypassTrigger()