import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface UnifiedActivity {
  id: string
  type: 'new_follower' | 'post_like' | 'post_comment' | 'post_share' | 'message' | 'event'
  userId: string
  userName: string
  userAvatar: string | null
  userRole: string | null
  isVerified: boolean
  message: string
  details: string | null
  timestamp: string
  priority: 'low' | 'medium' | 'high'
}

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = createServiceRoleClient()
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      followersResult,
      likesResult,
      commentsResult,
      sharesResult,
      eventsResult,
    ] = await Promise.allSettled([
      // New followers
      supabase
        .from('follows')
        .select(`
          id,
          created_at,
          follower:profiles!follows_follower_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_verified,
            role
          )
        `)
        .eq('following_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),

      // Likes on user's posts
      supabase
        .from('post_likes')
        .select(`
          id,
          created_at,
          post_id,
          liker:profiles!post_likes_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_verified,
            role
          ),
          post:posts!inner (
            user_id,
            content
          )
        `)
        .eq('posts.user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),

      // Comments on user's posts
      supabase
        .from('post_comments')
        .select(`
          id,
          created_at,
          content,
          commenter:profiles!post_comments_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_verified,
            role
          ),
          post:posts!inner (
            user_id,
            content
          )
        `)
        .eq('posts.user_id', userId)
        .neq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),

      // Shares of user's posts
      supabase
        .from('post_shares')
        .select(`
          id,
          created_at,
          sharer:profiles!post_shares_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_verified,
            role
          ),
          post:posts!inner (
            user_id,
            content
          )
        `)
        .eq('posts.user_id', userId)
        .neq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),

      // Upcoming events
      supabase
        .from('events')
        .select('id, title, start_date, location')
        .eq('artist_id', userId)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5),
    ])

    const activities: UnifiedActivity[] = []

    // Process followers
    if (followersResult.status === 'fulfilled' && followersResult.value.data) {
      for (const follow of followersResult.value.data) {
        const follower = follow.follower as any
        if (!follower) continue
        activities.push({
          id: `follow-${follow.id}`,
          type: 'new_follower',
          userId: follower.id,
          userName: follower.full_name || follower.username || 'Someone',
          userAvatar: follower.avatar_url,
          userRole: follower.role,
          isVerified: follower.is_verified ?? false,
          message: 'started following you',
          details: null,
          timestamp: follow.created_at,
          priority: 'medium',
        })
      }
    }

    // Process likes
    if (likesResult.status === 'fulfilled' && likesResult.value.data) {
      for (const like of likesResult.value.data) {
        const liker = like.liker as any
        const post = like.post as any
        if (!liker) continue
        activities.push({
          id: `like-${like.id}`,
          type: 'post_like',
          userId: liker.id,
          userName: liker.full_name || liker.username || 'Someone',
          userAvatar: liker.avatar_url,
          userRole: liker.role,
          isVerified: liker.is_verified ?? false,
          message: 'liked your post',
          details: post?.content?.substring(0, 80) || null,
          timestamp: like.created_at,
          priority: 'low',
        })
      }
    }

    // Process comments
    if (commentsResult.status === 'fulfilled' && commentsResult.value.data) {
      for (const comment of commentsResult.value.data) {
        const commenter = comment.commenter as any
        if (!commenter) continue
        activities.push({
          id: `comment-${comment.id}`,
          type: 'post_comment',
          userId: commenter.id,
          userName: commenter.full_name || commenter.username || 'Someone',
          userAvatar: commenter.avatar_url,
          userRole: commenter.role,
          isVerified: commenter.is_verified ?? false,
          message: 'commented on your post',
          details: comment.content?.substring(0, 80) || null,
          timestamp: comment.created_at,
          priority: 'medium',
        })
      }
    }

    // Process shares
    if (sharesResult.status === 'fulfilled' && sharesResult.value.data) {
      for (const share of sharesResult.value.data) {
        const sharer = share.sharer as any
        if (!sharer) continue
        activities.push({
          id: `share-${share.id}`,
          type: 'post_share',
          userId: sharer.id,
          userName: sharer.full_name || sharer.username || 'Someone',
          userAvatar: sharer.avatar_url,
          userRole: sharer.role,
          isVerified: sharer.is_verified ?? false,
          message: 'shared your post',
          details: null,
          timestamp: share.created_at,
          priority: 'low',
        })
      }
    }

    // Process events
    if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
      for (const event of eventsResult.value.data) {
        activities.push({
          id: `event-${event.id}`,
          type: 'event',
          userId: 'system',
          userName: 'Upcoming Event',
          userAvatar: null,
          userRole: null,
          isVerified: false,
          message: event.title || 'Event',
          details: event.location || null,
          timestamp: event.start_date,
          priority: 'high',
        })
      }
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      success: true,
      activities: activities.slice(0, limit),
      total: activities.length,
    })
  } catch (error) {
    console.error('[Community Activity API] Error:', error)
    return NextResponse.json({
      success: true,
      activities: [],
      total: 0,
    })
  }
})
