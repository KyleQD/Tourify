import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAuth } from '@/lib/auth/api-auth'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

// Create service role client directly
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const postId = resolvedParams.id
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    console.log('💬 Fetching comments for post:', postId)

    // Try a simple query first without joins
    let comments: any[] = []
    let error: any = null

    try {
      const result = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      comments = result.data || []
      error = result.error

      if (error) {
        console.error('❌ Simple query failed:', error)
        console.error('Error code:', error.code)
        console.error('Error details:', error.details)
        
        // If table doesn't exist, return empty comments
        if (error.code === 'PGRST106' || error.message?.includes('does not exist')) {
          console.log('📝 post_comments table does not exist, returning empty comments')
          return NextResponse.json({
            comments: [],
            total: 0,
            offset,
            limit,
            error_info: 'post_comments table does not exist'
          })
        }
        
        throw error
      }

      console.log('✅ Simple query succeeded, got', comments.length, 'comments')
    } catch (simpleError) {
      console.error('❌ Simple query error:', simpleError)
      return NextResponse.json({ 
        error: 'Failed to fetch comments', 
        details: (simpleError as Error).message 
      }, { status: 500 })
    }

    // If we have comments, try to get user info separately
    const transformedComments = []
    
    for (const comment of comments) {
      let userInfo = {
        id: comment.user_id,
        username: 'user',
        full_name: 'Anonymous User',
        avatar_url: '',
        is_verified: false
      }

      // Try to get user profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified, metadata')
          .eq('id', comment.user_id)
          .single()

        if (profile) {
          userInfo = {
            id: comment.user_id,
            username: profile.metadata?.username || profile.username || 'user',
            full_name: profile.metadata?.full_name || profile.full_name || 'Anonymous User',
            avatar_url: profile.avatar_url || '',
            is_verified: profile.is_verified || false
          }
        }
      } catch (profileError) {
        console.log('⚠️ Could not fetch profile for user:', comment.user_id, profileError)
      }

      transformedComments.push({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: userInfo
      })
    }

    console.log('💬 Retrieved and transformed comments:', transformedComments.length)

    return NextResponse.json({
      comments: transformedComments,
      total: transformedComments.length,
      offset,
      limit
    })

  } catch (error) {
    console.error('❌ Unexpected error fetching comments:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch comments', 
      details: (error as Error).message 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const postId = resolvedParams.id
    const supabase = createServiceClient()
    
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = auth.user

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    console.log('💬 Adding comment to post:', { postId, userId: user.id, content: content.substring(0, 50) + '...' })

    // Add comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (commentError) {
      console.error('Error adding comment:', commentError)
      const errorText = await request.text()
      console.error('Comments API error:', request.method, request.url, errorText)
      return NextResponse.json({ 
        error: 'Failed to add comment',
        details: commentError.message 
      }, { status: 500 })
    }

    console.log('✅ Comment added successfully:', comment.id)

    // Get user profile separately
    let userInfo = {
      id: user.id,
      username: 'user',
      full_name: 'Anonymous User',
      avatar_url: '',
      is_verified: false
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_verified, metadata')
        .eq('id', user.id)
        .single()

      if (profile) {
        userInfo = {
          id: user.id,
          username: profile.metadata?.username || profile.username || 'user',
          full_name: profile.metadata?.full_name || profile.full_name || 'Anonymous User',
          avatar_url: profile.avatar_url || '',
          is_verified: profile.is_verified || false
        }
      }
    } catch (profileError) {
      console.log('⚠️ Could not fetch profile for user:', user.id, profileError)
    }

    const transformedComment = {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: userInfo
    }

    // Update post comments count
    const { error: updateError } = await supabase
      .rpc('increment_comments_count', { post_id: postId })

    if (updateError) {
      console.error('Error updating comments count:', updateError)
      // Try fallback method
      try {
        const { data: currentPost } = await supabase
          .from('posts')
          .select('comments_count')
          .eq('id', postId)
          .single()
        
        if (currentPost) {
          await supabase
            .from('posts')
            .update({ comments_count: (currentPost.comments_count || 0) + 1 })
            .eq('id', postId)
        }
      } catch (fallbackError) {
        console.error('Fallback update also failed:', fallbackError)
      }
    }

    console.log('✅ Successfully added comment')

    const { data: postRow } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()
    if (postRow?.user_id) {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: postRow.user_id,
        metricKey: 'post_interactions_total',
        eventType: 'post_comment_received',
        delta: 1,
        eventSource: 'api_post_comment',
        eventData: { post_id: postId }
      })
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: postRow.user_id,
        metricKey: 'post_comments_total',
        eventType: 'post_comment_received',
        delta: 1,
        eventSource: 'api_post_comment',
        eventData: { post_id: postId }
      })
    }

    return NextResponse.json({ comment: transformedComment })

  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
} 