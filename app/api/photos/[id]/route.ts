import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/photos/[id]
 * Fetch a single photo with full details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const photoId = params.id

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch photo with tags
    const { data: photo, error } = await supabase
      .from('photos')
      .select(`
        *,
        photo_tags (
          id,
          tag_type,
          tagged_user_id,
          tagged_event_id,
          tag_text,
          position_x,
          position_y,
          created_by,
          created_at
        )
      `)
      .eq('id', photoId)
      .single()

    if (error || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Check permissions for private photos
    if (!photo.is_public) {
      if (!user || (photo.user_id !== user.id && !await hasPhotoAccess(supabase, photoId, user.id))) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Increment view count
    await supabase
      .from('photos')
      .update({ views: photo.views + 1 })
      .eq('id', photoId)

    return NextResponse.json({ photo })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/photos/[id]
 * Update a photo
 */
export async function PATCH(
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

    // Check ownership
    const { data: photo, error: checkError } = await supabase
      .from('photos')
      .select('user_id')
      .eq('id', photoId)
      .single()

    if (checkError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    if (photo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      altText,
      category,
      location,
      photographerName,
      shotDate,
      isForSale,
      salePrice,
      licenseType,
      usageRights,
      isPublic,
      isFeatured,
      tags,
      orderIndex
    } = body

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (altText !== undefined) updateData.alt_text = altText
    if (category !== undefined) updateData.category = category
    if (location !== undefined) updateData.location = location
    if (photographerName !== undefined) updateData.photographer_name = photographerName
    if (shotDate !== undefined) updateData.shot_date = shotDate
    if (isForSale !== undefined) updateData.is_for_sale = isForSale
    if (salePrice !== undefined) updateData.sale_price = salePrice
    if (licenseType !== undefined) updateData.license_type = licenseType
    if (usageRights !== undefined) updateData.usage_rights = usageRights
    if (isPublic !== undefined) updateData.is_public = isPublic
    if (isFeatured !== undefined) updateData.is_featured = isFeatured
    if (tags !== undefined) updateData.tags = tags
    if (orderIndex !== undefined) updateData.order_index = orderIndex

    const { data: updatedPhoto, error: updateError } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', photoId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating photo:', updateError)
      return NextResponse.json(
        { error: 'Failed to update photo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photo: updatedPhoto })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photos/[id]
 * Delete a photo
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

    // Check ownership
    const { data: photo, error: checkError } = await supabase
      .from('photos')
      .select('user_id')
      .eq('id', photoId)
      .single()

    if (checkError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    if (photo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete photo
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting photo:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete photo' },
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

// Helper function to check if user has access to photo
async function hasPhotoAccess(supabase: any, photoId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('photo_purchases')
    .select('id')
    .eq('photo_id', photoId)
    .eq('buyer_user_id', userId)
    .eq('payment_status', 'completed')
    .single()
  
  return !!data
}

