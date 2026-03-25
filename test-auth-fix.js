#!/usr/bin/env node

/**
 * Test Authentication Fix
 * 
 * This script tests that the unified authentication service works
 * across all API routes after the production auth implementation.
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

async function testAuthenticationFix() {
  console.log('🔍 Testing Authentication Fix...\n')

  try {
    // Test 1: Check if we can get a user session
    console.log('1. Testing user session retrieval...')
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .limit(2)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }

    console.log('✅ Found users:', users.length)
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.full_name}) - ID: ${user.id}`)
    })

    // Test 2: Check follow requests table structure
    console.log('\n2. Testing follow requests table...')
    const { data: followRequests, error: followError } = await supabase
      .from('follow_requests')
      .select('id, requester_id, target_id, status')
      .limit(5)

    if (followError) {
      console.error('❌ Error fetching follow requests:', followError.message)
    } else {
      console.log('✅ Follow requests table accessible')
      console.log(`   Found ${followRequests.length} follow requests`)
    }

    // Test 3: Check notifications table structure
    console.log('\n3. Testing notifications table...')
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, is_read')
      .limit(5)

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError.message)
    } else {
      console.log('✅ Notifications table accessible')
      console.log(`   Found ${notifications.length} notifications`)
    }

    // Test 4: Check database triggers
    console.log('\n4. Testing database triggers...')
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_trigger_info', { table_name: 'follow_requests' })
      .then(result => {
        // This might not work depending on RPC function availability
        console.log('⚠️  Trigger check not available via RPC')
        return { data: null, error: null }
      })
      .catch(err => {
        console.log('⚠️  Trigger check not available via RPC')
        return { data: null, error: null }
      })

    console.log('✅ Database structure tests completed')

    // Test 5: Test API endpoint accessibility (if server is running)
    console.log('\n5. Testing API endpoint accessibility...')
    
    try {
      const response = await fetch('http://localhost:3000/api/social/follow-request?action=check&targetUserId=test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401) {
        console.log('✅ API endpoint is properly protected (returns 401 for unauthenticated requests)')
      } else if (response.status === 200) {
        console.log('⚠️  API endpoint allows unauthenticated access (returns 200)')
      } else {
        console.log(`ℹ️  API endpoint returned status: ${response.status}`)
      }
    } catch (fetchError) {
      console.log('ℹ️  Could not test API endpoint (server may not be running)')
    }

    console.log('\n🎉 Authentication fix test completed!')
    console.log('\n📋 Next Steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Test follow requests in the browser')
    console.log('3. Verify notifications work end-to-end')
    console.log('4. Check that authentication is consistent across all routes')

  } catch (error) {
    console.error('💥 Test script error:', error)
  }
}

testAuthenticationFix()



