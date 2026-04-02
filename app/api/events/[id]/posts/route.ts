import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canAccessEventAsViewer,
  resolveEventReference,
} from '../../_lib/event-reference'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const reference = await resolveEventReference(supabase, eventId)

    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const { data: posts, error } = await supabase
      .from('event_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('event_id', reference.id)
      .eq('event_table', reference.table)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching event posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('Error in event posts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, type = 'text', media_urls = [], visibility = 'public' } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const reference = await resolveEventReference(supabase, eventId)
    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const isCreator = reference.ownerUserId === user.id
    
    // Check if user is attending (for non-creators)
    let isAttending = false
    if (!isCreator) {
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('status')
        .eq('event_id', reference.id)
        .eq('user_id', user.id)
        .eq('event_table', reference.table)
        .single()
      
      isAttending = attendance?.status === 'attending'
    }

    if (!isCreator && !isAttending && visibility !== 'public') {
      return NextResponse.json(
        { error: 'You can only post publicly unless you are attending this event' },
        { status: 403 }
      )
    }

    if (!canAccessEventAsViewer(reference, user.id) && !isCreator) {
      return NextResponse.json(
        { error: 'Cannot post in unpublished events' },
        { status: 403 }
      )
    }

    // Create the post
    const { data: newPost, error } = await supabase
      .from('event_posts')
      .insert({
        event_id: reference.id,
        event_table: reference.table,
        user_id: user.id,
        content: content.trim(),
        type,
        media_urls: media_urls.length > 0 ? media_urls : null,
        visibility,
        is_announcement: isCreator,
        is_pinned: false,
        likes_count: 0,
        comments_count: 0
      })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .single()

    if (error) {
      console.error('Error creating event post:', error)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ post: newPost })
  } catch (error) {
    console.error('Error in event posts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


