import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseAuthFromCookies } from '@/lib/auth/api-auth'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const postId = params.id
    const supabase = createServiceRoleClient()
    const auth = await parseAuthFromCookies(request as any)
    const user = auth?.user

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    console.log('👍 Checking like status for post:', postId)

    // Get total likes count
    const { count: totalLikes } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    // Check if current user has liked the post
    let isLiked = false
    if (user?.id) {
      const { data: userLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      isLiked = !!userLike
    }

    console.log('👍 Like status:', { totalLikes, isLiked, userId: user?.id })

    return NextResponse.json({
      likes_count: totalLikes || 0,
      is_liked: isLiked
    })

  } catch (error) {
    console.error('Error fetching like status:', error)
    return NextResponse.json({ error: 'Failed to fetch like status' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const postId = params.id
    const supabase = createServiceRoleClient()
    const auth = await parseAuthFromCookies(request as any)
    const user = auth?.user

    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const { action } = await request.json()
    console.log('👍 Processing like action:', { action, postId, userId: user.id })

    // Check if user has already liked the post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single()

    if (action === 'like') {
      if (existingLike) {
        return NextResponse.json({ error: 'Post already liked' }, { status: 400 })
      }

      // Add like
      const { error: likeError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString()
        })

      if (likeError) {
        console.error('Error adding like:', likeError)
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 })
      }

      // Likes count is derived from post_likes; no direct counter update needed
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
          eventType: 'post_like_received',
          delta: 1,
          eventSource: 'api_post_like',
          eventData: { post_id: postId }
        })
      }

      console.log('✅ Successfully liked post')
      return NextResponse.json({ success: true, action: 'liked' })

    } else if (action === 'unlike') {
      if (!existingLike) {
        return NextResponse.json({ error: 'Post not liked' }, { status: 400 })
      }

      // Remove like
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (unlikeError) {
        console.error('Error removing like:', unlikeError)
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 })
      }

      // Likes count is derived from post_likes; no direct counter update needed

      console.log('✅ Successfully unliked post')
      return NextResponse.json({ success: true, action: 'unliked' })

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "like" or "unlike"' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing like action:', error)
    return NextResponse.json({ error: 'Failed to process like action' }, { status: 500 })
  }
} 