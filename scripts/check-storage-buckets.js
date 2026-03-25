#!/usr/bin/env node

/**
 * Check Storage Buckets Script
 * Verifies that the required storage buckets exist and have proper RLS policies
 */

const { createClient } = require('@supabase/supabase-js')

async function checkStorageBuckets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Checking storage buckets...\n')

  // Check if post-media bucket exists
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Error fetching buckets:', error.message)
      return
    }

    const bucketNames = buckets.map(bucket => bucket.id)
    console.log('📦 Available buckets:', bucketNames.join(', '))

    // Check for required buckets
    const requiredBuckets = ['post-media', 'avatars', 'venue-media', 'event-media']
    const missingBuckets = requiredBuckets.filter(bucket => !bucketNames.includes(bucket))

    if (missingBuckets.length > 0) {
      console.log('\n❌ Missing required buckets:', missingBuckets.join(', '))
      console.log('\n📝 To fix this, run the following SQL in your Supabase dashboard:')
      console.log(`
-- Create missing buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ${missingBuckets.map(bucket => `('${bucket}', '${bucket}', true)`).join(',\n  ')}
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;
      `)
    } else {
      console.log('\n✅ All required buckets exist')
    }

    // Test post-media bucket specifically
    if (bucketNames.includes('post-media')) {
      console.log('\n🧪 Testing post-media bucket permissions...')
      
      // Try to list files (this tests read permissions)
      const { data: files, error: listError } = await supabase.storage
        .from('post-media')
        .list('', { limit: 1 })
      
      if (listError) {
        console.log('⚠️  Warning: Cannot list files in post-media bucket:', listError.message)
      } else {
        console.log('✅ post-media bucket is accessible')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Run the check
checkStorageBuckets().catch(console.error)
