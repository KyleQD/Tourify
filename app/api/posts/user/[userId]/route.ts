import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    console.log('[User Posts API] GET request started')
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase } = authResult
    const { userId } = await params

    console.log('[User Posts API] Fetching posts for user:', userId)

    // Get the user's posts with profile data
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        type,
        visibility,
        location,
        hashtags,
        media_urls,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at,
        user_id,
        profiles:user_id (
          id,
          username,
          avatar_url,
          full_name,
          is_verified
        )
      `)
      .eq('user_id', userId)
      .eq('visibility', 'public') // Only show public posts
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('[User Posts API] Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    console.log('[User Posts API] Found posts:', posts?.length || 0)

    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('[User Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
