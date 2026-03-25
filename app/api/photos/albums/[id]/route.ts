import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/photos/albums/[id]
 * Fetch a single album with its photos
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const albumId = params.id

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch album
    const { data: album, error: albumError } = await supabase
      .from('photo_albums')
      .select('*')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!album.is_public && (!user || album.user_id !== user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch photos in album
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      album,
      photos: photos || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/photos/albums/[id]
 * Update an album
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const albumId = params.id

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: album, error: checkError } = await supabase
      .from('photo_albums')
      .select('user_id')
      .eq('id', albumId)
      .single()

    if (checkError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      )
    }

    if (album.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      category,
      tags,
      isPublic,
      isFeatured,
      coverPhotoId
    } = body

    // Update album
    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (isPublic !== undefined) updateData.is_public = isPublic
    if (isFeatured !== undefined) updateData.is_featured = isFeatured
    if (coverPhotoId !== undefined) updateData.cover_photo_id = coverPhotoId

    const { data: updatedAlbum, error: updateError } = await supabase
      .from('photo_albums')
      .update(updateData)
      .eq('id', albumId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating album:', updateError)
      return NextResponse.json(
        { error: 'Failed to update album' },
        { status: 500 }
      )
    }

    return NextResponse.json({ album: updatedAlbum })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photos/albums/[id]
 * Delete an album and all its photos
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const albumId = params.id

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: album, error: checkError } = await supabase
      .from('photo_albums')
      .select('user_id')
      .eq('id', albumId)
      .single()

    if (checkError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      )
    }

    if (album.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete album (photos will be cascade deleted due to foreign key)
    const { error: deleteError } = await supabase
      .from('photo_albums')
      .delete()
      .eq('id', albumId)

    if (deleteError) {
      console.error('Error deleting album:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete album' },
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

