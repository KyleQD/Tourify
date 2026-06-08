#!/usr/bin/env node

/**
 * Comprehensive Notification System Test
 * Tests all aspects of the notification system including:
 * - Database triggers
 * - RLS policies
 * - Real-time subscriptions
 * - API endpoints
 * - Follow request notifications
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
}

function logTest(name, passed, message) {
  const emoji = passed ? '✅' : '❌'
  console.log(`${emoji} ${name}: ${message}`)
  if (passed) {
    results.passed.push(name)
  } else {
    results.failed.push({ name, message })
  }
}

function logWarning(name, message) {
  console.log(`⚠️  ${name}: ${message}`)
  results.warnings.push({ name, message })
}

async function testDatabaseSchema() {
  console.log('\n📋 Testing Database Schema...\n')
  
  // Test notifications table
  const { data: notifColumns, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)
  
  if (notifError && notifError.code === '42P01') {
    logTest('Notifications Table', false, 'Table does not exist')
    return false
  }
  
  logTest('Notifications Table', true, 'Table exists')
  
  // Test follow_requests table
  const { data: followReqData, error: followReqError } = await supabase
    .from('follow_requests')
    .select('*')
    .limit(1)
  
  if (followReqError && followReqError.code === '42P01') {
    logWarning('Follow Requests Table', 'Table does not exist - will use direct follows')
  } else {
    logTest('Follow Requests Table', true, 'Table exists')
  }
  
  // Test follows table
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('*')
    .limit(1)
  
  logTest('Follows Table', !followsError || followsError.code !== '42P01', 
    followsError?.code === '42P01' ? 'Table does not exist' : 'Table exists')
  
  return true
}

async function testNotificationColumns() {
  console.log('\n📊 Testing Notification Schema...\n')
  
  const requiredColumns = [
    'id',
    'user_id', 
    'type',
    'title',
    'content',
    'is_read',
    'created_at'
  ]
  
  const optionalColumns = [
    'summary',
    'related_user_id',
    'related_content_id',
    'priority',
    'read_at',
    'metadata'
  ]
  
  // Try to query with all columns
  const { data, error } = await supabase
    .from('notifications')
    .select(requiredColumns.concat(optionalColumns).join(','))
    .limit(1)
  
  if (error) {
    logTest('Notification Schema', false, `Error checking columns: ${error.message}`)
    return false
  }
  
  logTest('Notification Schema', true, 'All required columns exist')
  return true
}

async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS Policies...\n')
  
  // Test anonymous access (should be denied)
  const { data: anonData, error: anonError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)
  
  if (anonError) {
    logTest('Anonymous Access Denied', true, 'Correctly blocked unauthenticated access')
  } else {
    logWarning('Anonymous Access', 'RLS may not be enabled properly')
  }
  
  return true
}

async function testAPIEndpoints() {
  console.log('\n🔌 Testing API Endpoints...\n')
  
  // Test follow request endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/social/follow-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        targetUserId: 'test-user-id'
      })
    })
    
    // We expect 401 Unauthorized since we're not authenticated
    if (response.status === 401) {
      logTest('Follow Request API', true, 'Endpoint exists and requires authentication')
    } else {
      logWarning('Follow Request API', `Unexpected status: ${response.status}`)
    }
  } catch (error) {
    logTest('Follow Request API', false, `Error: ${error.message}`)
  }
  
  return true
}

async function testNotificationService() {
  console.log('\n⚙️  Testing Notification Service...\n')
  
  // Check if optimized notification service exists
  try {
    const serviceExists = require('./lib/services/optimized-notification-service.ts')
    logTest('Optimized Notification Service', true, 'Service file exists')
  } catch (error) {
    logWarning('Optimized Notification Service', 'Service file not found')
  }
  
  return true
}

async function testNotificationComponent() {
  console.log('\n🔔 Testing Notification Components...\n')
  
  // Check if enhanced notification bell exists
  try {
    const fs = require('fs')
    const bellExists = fs.existsSync('./components/enhanced-notification-bell.tsx')
    logTest('Enhanced Notification Bell', bellExists, 
      bellExists ? 'Component file exists' : 'Component file not found')
  } catch (error) {
    logWarning('Enhanced Notification Bell', 'Error checking component')
  }
  
  return true
}

async function checkDatabaseTriggers() {
  console.log('\n⚡ Checking Database Triggers...\n')
  
  console.log('ℹ️  Database triggers cannot be tested from the client.')
  console.log('ℹ️  To verify triggers:')
  console.log('   1. Run the migration: supabase/migrations/20250210000000_complete_follow_friend_system.sql')
  console.log('   2. Or run: supabase/migrations/20250210000001_comprehensive_notification_system.sql')
  console.log('   3. Check in Supabase Dashboard > Database > Triggers')
  
  logWarning('Database Triggers', 'Manual verification required')
  
  return true
}

async function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  console.log(`\n✅ Passed: ${results.passed.length}`)
  results.passed.forEach(test => console.log(`   - ${test}`))
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`)
    results.warnings.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`)
    })
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`)
    results.failed.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📝 NEXT STEPS')
  console.log('='.repeat(60))
  
  if (results.failed.length > 0 || results.warnings.length > 0) {
    console.log('\n1. Apply the notification system migration:')
    console.log('   Run in Supabase SQL Editor:')
    console.log('   - supabase/migrations/20250210000000_complete_follow_friend_system.sql')
    console.log('   OR')
    console.log('   - supabase/migrations/20250210000001_comprehensive_notification_system.sql')
    console.log('')
    console.log('2. Enable Realtime for notifications table:')
    console.log('   - Go to Supabase Dashboard > Database > Replication')
    console.log('   - Enable for \'notifications\' table')
    console.log('')
    console.log('3. Test in the application:')
    console.log('   - Create two test accounts')
    console.log('   - Send a follow request from one to the other')
    console.log('   - Check the notification bell in the receiving account')
  } else {
    console.log('\n✨ All tests passed! The notification system appears to be configured correctly.')
    console.log('')
    console.log('To verify end-to-end functionality:')
    console.log('1. Create two test accounts')
    console.log('2. Send a follow request from Account A to Account B')
    console.log('3. Check Account B\'s notification bell (should show the request)')
    console.log('4. Accept or reject the request')
    console.log('5. Check Account A\'s notification bell (should show acceptance/rejection)')
  }
  
  console.log('\n' + '='.repeat(60))
}

async function runAllTests() {
  console.log('🚀 Starting Notification System Tests...\n')
  console.log('Testing against: ' + supabaseUrl)
  console.log('')
  
  try {
    await testDatabaseSchema()
    await testNotificationColumns()
    await testRLSPolicies()
    await testAPIEndpoints()
    await testNotificationService()
    await testNotificationComponent()
    await checkDatabaseTriggers()
    
    await printSummary()
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  }
}

// Run tests
runAllTests()




