import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult


    // Get the user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        media_urls,
        likes_count,
        comments_count,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('[Profile Posts API] Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }


    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('[Profile Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 