#!/usr/bin/env node

/**
 * Friend Request Flow Test Script
 * This script tests the complete friend request notification flow
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

async function testFriendRequestFlow() {
  console.log('🔍 Testing Friend Request Flow...\n')

  try {
    // 1. Get available users
    console.log('1️⃣ Getting available users...')
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .limit(10)

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need at least 2 users to test friend request flow')
      return
    }

    console.log(`✅ Found ${users.length} users`)
    
    // Use first two users for testing
    const requester = users[0]
    const target = users[1]
    
    console.log(`👤 Requester: ${requester.username || requester.full_name || requester.id}`)
    console.log(`👤 Target: ${target.username || target.full_name || target.id}`)

    // 2. Check existing follow requests
    console.log('\n2️⃣ Checking existing follow requests...')
    const { data: existingRequests } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('requester_id', requester.id)
      .eq('target_id', target.id)

    if (existingRequests && existingRequests.length > 0) {
      console.log('⚠️ Follow request already exists, cleaning up...')
      await supabase
        .from('follow_requests')
        .delete()
        .eq('requester_id', requester.id)
        .eq('target_id', target.id)
    }

    // 3. Create follow request
    console.log('\n3️⃣ Creating follow request...')
    const { data: followRequest, error: followRequestError } = await supabase
      .from('follow_requests')
      .insert({
        requester_id: requester.id,
        target_id: target.id,
        status: 'pending'
      })
      .select()

    if (followRequestError) {
      console.error('❌ Failed to create follow request:', followRequestError.message)
      return
    }

    console.log('✅ Follow request created:', followRequest[0].id)

    // 4. Check if notification was created
    console.log('\n4️⃣ Checking for notification...')
    
    // Wait a moment for any triggers to execute
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', target.id)
      .eq('type', 'follow_request')
      .order('created_at', { ascending: false })
      .limit(5)

    if (notificationsError) {
      console.error('❌ Failed to check notifications:', notificationsError.message)
    } else {
      console.log(`✅ Found ${notifications.length} follow request notifications for target user`)
      
      if (notifications.length > 0) {
        const latestNotification = notifications[0]
        console.log('📧 Latest notification:', {
          id: latestNotification.id,
          title: latestNotification.title,
          content: latestNotification.content,
          type: latestNotification.type,
          is_read: latestNotification.is_read,
          created_at: latestNotification.created_at
        })
      } else {
        console.log('⚠️ No follow request notifications found - this indicates the issue!')
      }
    }

    // 5. Test notification creation manually
    console.log('\n5️⃣ Testing manual notification creation...')
    const { data: manualNotification, error: manualError } = await supabase
      .from('notifications')
      .insert({
        user_id: target.id,
        type: 'follow_request',
        title: 'Test Follow Request',
        content: 'This is a test follow request notification',
        summary: 'Test follow request',
        related_user_id: requester.id,
        priority: 'normal',
        is_read: false
      })
      .select()

    if (manualError) {
      console.error('❌ Manual notification creation failed:', manualError.message)
      console.error('This indicates a schema issue that needs to be fixed')
    } else {
      console.log('✅ Manual notification created successfully:', manualNotification[0].id)
      
      // Clean up manual test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', manualNotification[0].id)
      console.log('🧹 Manual test notification cleaned up')
    }

    // 6. Clean up follow request
    console.log('\n6️⃣ Cleaning up test follow request...')
    await supabase
      .from('follow_requests')
      .delete()
      .eq('id', followRequest[0].id)
    console.log('🧹 Follow request cleaned up')

    console.log('\n🎉 Friend Request Flow Test Complete!')
    console.log('\n📋 Results:')
    if (notifications && notifications.length > 0) {
      console.log('✅ Friend request notifications are working correctly')
    } else {
      console.log('❌ Friend request notifications are NOT working')
      console.log('🔧 Action needed: Apply the SQL schema fix')
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testFriendRequestFlow()
