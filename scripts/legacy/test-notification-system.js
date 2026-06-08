#!/usr/bin/env node

/**
 * Notification System Diagnostic Script
 * This script tests the complete notification flow to identify issues
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runDiagnostics() {
  console.log('🔍 Starting Notification System Diagnostics...\n')

  try {
    // 1. Check notifications table structure
    console.log('1️⃣ Checking notifications table structure...')
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1)

    if (notificationsError) {
      console.error('❌ Notifications table error:', notificationsError.message)
    } else {
      console.log('✅ Notifications table accessible')
      if (notificationsData.length > 0) {
        console.log('📊 Sample notification fields:', Object.keys(notificationsData[0]))
      }
    }

    // 2. Check follow_requests table
    console.log('\n2️⃣ Checking follow_requests table...')
    const { data: followRequestsData, error: followRequestsError } = await supabase
      .from('follow_requests')
      .select('*')
      .limit(1)

    if (followRequestsError) {
      console.error('❌ Follow requests table error:', followRequestsError.message)
    } else {
      console.log('✅ Follow requests table accessible')
      if (followRequestsData.length > 0) {
        console.log('📊 Sample follow request fields:', Object.keys(followRequestsData[0]))
      }
    }

    // 3. Check users table
    console.log('\n3️⃣ Checking users table...')
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .limit(5)

    if (usersError) {
      console.error('❌ Profiles table error:', usersError.message)
    } else {
      console.log('✅ Profiles table accessible')
      console.log('👥 Available users:', usersData.length)
      if (usersData.length >= 2) {
        console.log('📊 Sample users:', usersData.slice(0, 2).map(u => ({ id: u.id, username: u.username })))
      }
    }

    // 4. Test notification creation
    console.log('\n4️⃣ Testing notification creation...')
    if (usersData && usersData.length >= 2) {
      const testUserId = usersData[0].id
      const { data: testNotification, error: testError } = await supabase
        .from('notifications')
        .insert({
          user_id: testUserId,
          type: 'test',
          title: 'Test Notification',
          content: 'This is a test notification',
          summary: 'Test notification',
          priority: 'normal',
          is_read: false
        })
        .select()

      if (testError) {
        console.error('❌ Test notification creation failed:', testError.message)
      } else {
        console.log('✅ Test notification created successfully:', testNotification[0].id)
        
        // Clean up test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('id', testNotification[0].id)
        console.log('🧹 Test notification cleaned up')
      }
    } else {
      console.log('⚠️ Not enough users to test notification creation')
    }

    // 5. Check recent notifications
    console.log('\n5️⃣ Checking recent notifications...')
    const { data: recentNotifications, error: recentError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('❌ Failed to fetch recent notifications:', recentError.message)
    } else {
      console.log(`✅ Found ${recentNotifications.length} recent notifications`)
      if (recentNotifications.length > 0) {
        console.log('📊 Recent notification types:', [...new Set(recentNotifications.map(n => n.type))])
      }
    }

    // 6. Check recent follow requests
    console.log('\n6️⃣ Checking recent follow requests...')
    const { data: recentFollowRequests, error: followRequestsRecentError } = await supabase
      .from('follow_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (followRequestsRecentError) {
      console.error('❌ Failed to fetch recent follow requests:', followRequestsRecentError.message)
    } else {
      console.log(`✅ Found ${recentFollowRequests.length} recent follow requests`)
      if (recentFollowRequests.length > 0) {
        console.log('📊 Follow request statuses:', [...new Set(recentFollowRequests.map(f => f.status))])
      }
    }

    console.log('\n🎉 Diagnostic complete!')
    console.log('\n📋 Summary:')
    console.log('- Check the output above for any ❌ errors')
    console.log('- If notifications table is missing columns, run the SQL fix')
    console.log('- If follow_requests table is missing, it will be created by the API')
    console.log('- Test sending a friend request to verify the complete flow')

  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message)
  }
}

runDiagnostics()
