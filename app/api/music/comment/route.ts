import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { musicId, content, parentCommentId } = await request.json()
    
    if (!musicId || !content?.trim()) {
      return NextResponse.json({ error: 'Music ID and content are required' }, { status: 400 })
    }

    // Check if music exists and is public
    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, is_public, user_id')
      .eq('id', musicId)
      .single()

    if (musicError || !music) {
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })
    }

    if (!music.is_public && music.user_id !== user.id) {
      return NextResponse.json({ error: 'Music is private' }, { status: 403 })
    }

    // If this is a reply, check if parent comment exists
    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('music_comments')
        .select('id')
        .eq('id', parentCommentId)
        .eq('music_id', musicId)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('music_comments')
      .insert({
        music_id: musicId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_comment_id,
        profiles!inner(username, full_name, avatar_url)
      `)
      .single()

    if (commentError) {
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ 
      comment,
      message: 'Comment created successfully' 
    })
  } catch (error) {
    console.error('Error in music comment API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const musicId = searchParams.get('musicId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    if (!musicId) {
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })
    }

    // Check if music exists and is public
    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, is_public, user_id')
      .eq('id', musicId)
      .single()

    if (musicError || !music) {
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })
    }

    // Get user session for checking if they can view private music
    const { data: { user } } = await supabase.auth.getUser()
    if (!music.is_public && (!user || music.user_id !== user.id)) {
      return NextResponse.json({ error: 'Music is private' }, { status: 403 })
    }

    // Get comments
    const { data: comments, error: commentsError, count } = await supabase
      .from('music_comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        parent_comment_id,
        likes_count,
        profiles!inner(username, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('music_id', musicId)
      .is('parent_comment_id', null) // Only get top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (commentsError) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('music_comments')
          .select(`
            id,
            content,
            created_at,
            updated_at,
            user_id,
            parent_comment_id,
            likes_count,
            profiles!inner(username, full_name, avatar_url)
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true })

        return {
          ...comment,
          replies: replies || []
        }
      })
    )

    return NextResponse.json({ 
      comments: commentsWithReplies,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit
    })
  } catch (error) {
    console.error('Error in music comments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 