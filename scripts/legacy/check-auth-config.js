#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuthConfig() {
  console.log('🔍 Checking Supabase Auth Configuration...\n')
  
  try {
    // 1. Check if we can access auth.users table
    console.log('1. Testing auth.users table access...')
    
    try {
      const { count, error } = await supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Cannot access auth.users:', error.message)
        console.log('   This might indicate RLS or permission issues')
      } else {
        console.log(`✅ auth.users accessible, contains ${count} users`)
      }
    } catch (err) {
      console.error('❌ auth.users access error:', err.message)
    }
    
    // 2. Check if basic database connection works
    console.log('\n2. Testing basic database connection...')
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('❌ Database connection issue:', error.message)
      } else {
        console.log('✅ Database connection working')
      }
    } catch (err) {
      console.error('❌ Database connection error:', err.message)
    }
    
    // 3. Check if there are any RLS policies blocking auth operations
    console.log('\n3. Checking potential RLS conflicts...')
    
    try {
      // Try to insert a test record in profiles to see if RLS is blocking
      const testId = '99999999-9999-9999-9999-999999999999'
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: testId, name: 'RLS Test' })
      
      if (insertError) {
        if (insertError.message.includes('RLS') || insertError.message.includes('policy')) {
          console.log('⚠️  RLS policies might be interfering:', insertError.message)
        } else if (insertError.message.includes('foreign key')) {
          console.log('✅ RLS allows insert (foreign key error expected)')
        } else {
          console.log('⚠️  Insert error:', insertError.message)
        }
      } else {
        console.log('✅ RLS allows inserts')
        // Clean up
        await supabase.from('profiles').delete().eq('id', testId)
      }
    } catch (err) {
      console.log('⚠️  RLS test error:', err.message)
    }
    
    // 4. Test if we can create auth users directly (admin function)
    console.log('\n4. Testing admin user creation...')
    
    try {
      const testEmail = `admin-test-${Date.now()}@example.com`
      
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin Test User',
          username: 'admintest'
        }
      })
      
      if (adminError) {
        console.error('❌ Admin user creation failed:', adminError.message)
        console.log('   This suggests a deeper auth system issue')
      } else {
        console.log('✅ Admin user creation succeeded!')
        console.log('   User ID:', adminData.user?.id)
        console.log('   This means the issue is specifically with the signup endpoint')
        
        // Clean up
        if (adminData.user?.id) {
          setTimeout(async () => {
            await supabase.auth.admin.deleteUser(adminData.user.id)
            console.log('✅ Admin test user deleted')
          }, 1000)
        }
      }
    } catch (err) {
      console.error('❌ Admin test error:', err.message)
    }
    
    console.log('\n📋 SUMMARY:')
    console.log('If admin user creation works but signup fails, the issue is likely:')
    console.log('1. Email confirmation settings in Supabase Dashboard')
    console.log('2. Signup rate limiting')
    console.log('3. Auth schema constraints')
    console.log('4. Email provider configuration')
    
  } catch (error) {
    console.error('❌ Configuration check error:', error.message)
  }
}

checkAuthConfig()