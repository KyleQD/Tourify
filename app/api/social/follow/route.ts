import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

// Canonical profile-follow contract (also used by the legacy /api/follow shim):
// POST { followingId, action: 'follow' | 'unfollow' }
// 200 { success: true, action: 'followed' | 'unfollowed', isFollowing, changed }
// `changed` is false for a retry. Only a new insert records the achievement and
// sends a direct-follow notification; request notifications use their own flow.

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      console.error('❌ Authentication failed - no user from cookies')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    // Accept the legacy spelling only while /api/follow callers migrate.
    const followingId = body.followingId ?? body.following_id
    const action = body.action

    if (typeof followingId !== 'string' || !followingId || !action) {
      return NextResponse.json(
        { error: 'Following ID and action are required' },
        { status: 400 }
      )
    }

    if (followingId === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    if (action === 'follow') {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followingId
        })

      if (error) {
        // The unique key makes concurrent clicks and offline replays idempotent.
        if (error.code === '23505') {
          return NextResponse.json({ success: true, action: 'followed', isFollowing: true, changed: false })
        }
        console.error('Error following user:', error)
        return NextResponse.json(
          { error: 'Failed to follow user' },
          { status: 500 }
        )
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('followers_count')
          .eq('id', followingId)
          .maybeSingle()
        await achievementEngine.recordMetricEvent({
          supabase: supabase as any,
          userId: followingId,
          metricKey: 'followers_total',
          eventType: 'follower_gained',
          absoluteValue: profile?.followers_count ?? undefined,
          eventSource: 'api_follow'
        })
      } catch (achievementError) {
        // The relationship was committed. Do not report failure and induce a retry.
        console.warn('Follow achievement update failed:', achievementError)
      }
      try {
        await OptimizedNotificationService.sendFollowNotification(followingId, user.id)
      } catch (notificationError) {
        // Preferences or delivery problems must not turn a committed follow into failure.
        console.warn('Follow notification skipped:', notificationError)
      }

      return NextResponse.json({ success: true, action: 'followed', isFollowing: true, changed: true })
    } else if (action === 'unfollow') {
      // Remove follow relationship
      const { data, error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .select('id')

      if (error) {
        console.error('Error unfollowing user:', error)
        return NextResponse.json(
          { error: 'Failed to unfollow user' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, action: 'unfollowed', isFollowing: false, changed: Boolean(data?.length) })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "follow" or "unfollow"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Follow API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const followingId = searchParams.get('followingId')
    const action = searchParams.get('action')
    const type = searchParams.get('type') || 'following' // 'following' or 'followers'

    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      console.error('❌ Authentication failed - no user from cookies')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Handle follow status check
    if (action === 'check' && followingId) {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error)
        return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 })
      }

      return NextResponse.json({ isFollowing: !!data })
    }

    const targetUserId = userId || user.id

    let query
    if (type === 'following') {
      query = supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified,
            followers_count,
            following_count
          )
        `)
        .eq('follower_id', targetUserId)
    } else {
      query = supabase
        .from('follows')
        .select(`
          follower_id,
          created_at,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified,
            followers_count,
            following_count
          )
        `)
        .eq('following_id', targetUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching follows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch follows' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Follow fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
