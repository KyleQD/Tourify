import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { POST as canonicalFollowPost } from '@/app/api/social/follow/route'

// Compatibility endpoint for older clients. Mutations use the canonical
// /api/social/follow contract and its single achievement side-effect path.
export async function POST(request: NextRequest) {
  return canonicalFollowPost(request)
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
