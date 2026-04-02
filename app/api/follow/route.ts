import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult
    const body = await request.json()
    const { following_id, action } = body

    if (!following_id) {
      return NextResponse.json(
        { error: 'following_id is required' },
        { status: 400 }
      )
    }

    if (following_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    if (action === 'follow') {
      // Create follow relationship
      const { data, error } = await supabase
        .from('follows')
        .insert([{
          follower_id: user.id,
          following_id: following_id
        }])
        .select()
        .single()

      if (error) {
        // If it's a unique constraint violation, it means already following
        if (error.code === '23505') {
          return NextResponse.json({ 
            success: true, 
            message: 'Already following this user' 
          })
        }
        
        console.error('Error creating follow:', error)
        return NextResponse.json(
          { error: 'Failed to follow user' },
          { status: 500 }
        )
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', following_id)
        .single()

      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: following_id,
        metricKey: 'followers_total',
        eventType: 'follower_gained',
        absoluteValue: profile?.followers_count ?? undefined,
        eventSource: 'api_follow'
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully followed user',
        data 
      })
    } else if (action === 'unfollow') {
      // Remove follow relationship
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id)

      if (error) {
        console.error('Error unfollowing user:', error)
        return NextResponse.json(
          { error: 'Failed to unfollow user' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully unfollowed user' 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "follow" or "unfollow"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Follow API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const type = searchParams.get('type') || 'following' // 'following' or 'followers'

    const targetUserId = user_id || user.id

    if (type === 'following') {
      // Get users that this user follows
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('follower_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching following:', error)
        return NextResponse.json(
          { error: 'Failed to fetch following list' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        data: data || [], 
        count: data?.length || 0 
      })
    } else if (type === 'followers') {
      // Get users that follow this user
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          created_at,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching followers:', error)
        return NextResponse.json(
          { error: 'Failed to fetch followers list' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        data: data || [], 
        count: data?.length || 0 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "following" or "followers"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Follow GET API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
