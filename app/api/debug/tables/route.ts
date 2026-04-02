import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = createClient()

    console.log('🔍 Checking database tables...')

    // Check if post_comments table exists
    const { data: commentsTest, error: commentsError } = await supabase
      .from('post_comments')
      .select('*')
      .limit(1)

    // Check what tables are available by testing common ones
    const tableTests: { post_comments: string; posts: string; profiles: string; post_likes: string } = {
      post_comments: commentsError ? 'ERROR: ' + commentsError.message : 'EXISTS',
      posts: 'UNKNOWN',
      profiles: 'UNKNOWN',
      post_likes: 'UNKNOWN'
    }

    // Test posts table
    try {
      const { error: postsError } = await supabase.from('posts').select('id').limit(1)
      tableTests.posts = postsError ? 'ERROR: ' + postsError.message : 'EXISTS'
    } catch (e) {
      tableTests.posts = 'ERROR: ' + (e as Error).message
    }

    // Test profiles table
    try {
      const { error: profilesError } = await supabase.from('profiles').select('id').limit(1)
      tableTests.profiles = profilesError ? 'ERROR: ' + profilesError.message : 'EXISTS'
    } catch (e) {
      tableTests.profiles = 'ERROR: ' + (e as Error).message
    }

    // Test post_likes table
    try {
      const { error: likesError } = await supabase.from('post_likes').select('id').limit(1)
      tableTests.post_likes = likesError ? 'ERROR: ' + likesError.message : 'EXISTS'
    } catch (e) {
      tableTests.post_likes = 'ERROR: ' + (e as Error).message
    }

    // Also test the structure of post_comments if it exists
    let commentsStructure: string | string[] | null = null
    if (!commentsError) {
      try {
        const { data: sampleComment } = await supabase
          .from('post_comments')
          .select('*')
          .limit(1)
          .single()

        commentsStructure = sampleComment ? Object.keys(sampleComment) : 'No sample data'
      } catch (e) {
        commentsStructure = 'Could not get structure: ' + (e as Error).message
      }
    }

    console.log('📊 Table test results:', tableTests)
    console.log('🏗️ post_comments structure:', commentsStructure)

    return NextResponse.json({
      message: 'Database table check complete',
      tables: tableTests,
      post_comments_structure: commentsStructure,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking database tables:', error)
    return NextResponse.json({ 
      error: 'Failed to check database tables',
      details: (error as Error).message 
    }, { status: 500 })
  }
} 