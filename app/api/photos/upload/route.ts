import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/photos/upload
 * Upload a photo (metadata only - actual file upload happens client-side to storage)
 * This endpoint creates the database record after successful storage upload
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      albumId,
      accountType,
      title,
      description,
      altText,
      fullResUrl,
      previewUrl,
      thumbnailUrl,
      watermarkedUrl,
      fileSize,
      fullResSize,
      dimensions,
      fileFormat,
      category,
      location,
      photographerName,
      cameraInfo,
      exifData,
      shotDate,
      isForSale,
      salePrice,
      licenseType,
      usageRights,
      hasWatermark,
      watermarkText,
      watermarkPosition,
      isPublic,
      isFeatured,
      eventId,
      tags,
      orderIndex
    } = body

    // Validate required fields
    if (!accountType || !previewUrl || !thumbnailUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!dimensions || !dimensions.width || !dimensions.height) {
      return NextResponse.json(
        { error: 'Image dimensions are required' },
        { status: 400 }
      )
    }

    // Create photo record
    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        album_id: albumId || null,
        account_type: accountType,
        title,
        description,
        alt_text: altText,
        full_res_url: fullResUrl || previewUrl,
        preview_url: previewUrl,
        thumbnail_url: thumbnailUrl,
        file_size: fileSize,
        full_res_size: fullResSize,
        dimensions,
        file_format: fileFormat,
        category,
        location,
        photographer_name: photographerName,
        camera_info: cameraInfo,
        exif_data: exifData,
        shot_date: shotDate,
        is_for_sale: isForSale || false,
        sale_price: salePrice,
        license_type: licenseType,
        usage_rights: usageRights,
        has_watermark: hasWatermark || false,
        watermark_text: watermarkText,
        watermark_position: watermarkPosition,
        is_public: isPublic !== undefined ? isPublic : true,
        is_featured: isFeatured !== undefined ? isFeatured : false,
        event_id: eventId || null,
        tags: tags || [],
        order_index: orderIndex || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating photo record:', error)
      return NextResponse.json(
        { error: 'Failed to create photo record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

