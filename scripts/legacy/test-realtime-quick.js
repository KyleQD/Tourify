#!/usr/bin/env node

/**
 * Quick Real-time Test
 * Tests if real-time subscriptions are working for notifications
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

async function testRealtime() {
  console.log('🧪 Testing Real-time Subscriptions...\n')
  
  // Set up a subscription
  const channel = supabase
    .channel('test-notifications')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'notifications'
    }, (payload) => {
      console.log('✅ Real-time subscription working!')
      console.log('📨 Received:', payload.eventType, 'on notifications table')
      console.log('📊 Data:', payload.new || payload.old)
      process.exit(0)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to notifications table')
        console.log('⏳ Waiting for changes... (will timeout in 10 seconds)')
        
        // Try to create a test notification to trigger the subscription
        setTimeout(async () => {
          try {
            // This will likely fail due to RLS, but that's ok - we just want to see if real-time works
            await supabase.from('notifications').insert({
              user_id: '00000000-0000-0000-0000-000000000000', // fake UUID
              type: 'test',
              title: 'Test notification',
              content: 'Testing real-time'
            })
          } catch (error) {
            console.log('ℹ️  Test insert failed (expected due to RLS):', error.message)
          }
        }, 1000)
        
        // Timeout after 10 seconds
        setTimeout(() => {
          console.log('⏰ Timeout: No real-time events received')
          console.log('ℹ️  This could mean:')
          console.log('   1. Real-time is not enabled for notifications table')
          console.log('   2. No changes occurred to trigger the subscription')
          console.log('   3. RLS is blocking the test insert (which is normal)')
          process.exit(1)
        }, 10000)
      } else {
        console.log('❌ Failed to subscribe:', status)
        process.exit(1)
      }
    })
}

testRealtime().catch(console.error)



