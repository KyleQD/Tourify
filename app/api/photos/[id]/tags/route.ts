import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/photos/[id]/tags
 * Get all tags for a photo
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const photoId = params.id

    const supabase = await createClient()

    const { data: tags, error } = await supabase
      .from('photo_tags')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tags: tags || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/photos/[id]/tags
 * Add a tag to a photo
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const photoId = params.id

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tagType,
      taggedUserId,
      taggedEventId,
      tagText,
      positionX,
      positionY
    } = body

    // Validate required fields
    if (!tagType) {
      return NextResponse.json(
        { error: 'Tag type is required' },
        { status: 400 }
      )
    }

    // Validate that at least one target is provided
    if (!taggedUserId && !taggedEventId && !tagText) {
      return NextResponse.json(
        { error: 'At least one tag target must be provided' },
        { status: 400 }
      )
    }

    // Create tag
    const { data: tag, error } = await supabase
      .from('photo_tags')
      .insert({
        photo_id: photoId,
        tag_type: tagType,
        tagged_user_id: taggedUserId,
        tagged_event_id: taggedEventId,
        tag_text: tagText,
        position_x: positionX,
        position_y: positionY,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tag:', error)
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photos/[id]/tags
 * Remove a tag from a photo
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const photoId = params.id

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Check if user created the tag or owns the photo
    const { data: tag, error: checkError } = await supabase
      .from('photo_tags')
      .select('created_by, photo_id')
      .eq('id', tagId)
      .eq('photo_id', photoId)
      .single()

    if (checkError || !tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    // Check if user owns the photo
    const { data: photo } = await supabase
      .from('photos')
      .select('user_id')
      .eq('id', photoId)
      .single()

    if (!photo || (tag.created_by !== user.id && photo.user_id !== user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete tag
    const { error: deleteError } = await supabase
      .from('photo_tags')
      .delete()
      .eq('id', tagId)

    if (deleteError) {
      console.error('Error deleting tag:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

