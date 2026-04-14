import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = createServiceRoleClient()
    
    // Check posts table structure
    const { data: postsColumns, error: postsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'posts')
      .eq('table_schema', 'public')

    if (postsError) {
      console.error('Error getting posts columns:', postsError)
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    // Get sample posts
    const { data: samplePosts, error: sampleError } = await supabase
      .from('posts')
      .select('*')
      .limit(3)

    if (sampleError) {
      console.error('Error getting sample posts:', sampleError)
      return NextResponse.json({ error: sampleError.message }, { status: 500 })
    }

    // Check artist profiles for user bce15693-d2bf-42db-a2f2-68239568fafe
    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', 'bce15693-d2bf-42db-a2f2-68239568fafe')

    if (artistError) {
      console.error('Error getting artist profile:', artistError)
    }

    // Check profiles table for user
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'bce15693-d2bf-42db-a2f2-68239568fafe')

    if (userError) {
      console.error('Error getting user profile:', userError)
    }

    // Check if unified accounts table exists
    const { data: accountsTable, error: accountsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'accounts')
      .eq('table_schema', 'public')

    return NextResponse.json({
      posts_table_columns: postsColumns,
      sample_posts: samplePosts,
      artist_profile: artistProfile,
      user_profile: userProfile,
      accounts_table_exists: accountsTable && accountsTable.length > 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug schema error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 