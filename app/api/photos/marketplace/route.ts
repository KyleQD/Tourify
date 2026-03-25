import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/photos/marketplace
 * Browse photos available for purchase
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const licenseType = searchParams.get('licenseType')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const photographerId = searchParams.get('photographerId')
    const featured = searchParams.get('featured') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('photos')
      .select(`
        id,
        title,
        description,
        preview_url,
        thumbnail_url,
        watermarked_url,
        dimensions,
        category,
        photographer_name,
        shot_date,
        sale_price,
        license_type,
        usage_rights,
        tags,
        likes,
        views,
        purchases,
        created_at,
        user_id
      `)
      .eq('is_for_sale', true)
      .eq('is_public', true)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (licenseType) {
      query = query.eq('license_type', licenseType)
    }

    if (minPrice) {
      query = query.gte('sale_price', parseFloat(minPrice))
    }

    if (maxPrice) {
      query = query.lte('sale_price', parseFloat(maxPrice))
    }

    if (photographerId) {
      query = query.eq('user_id', photographerId)
    }

    if (featured) {
      query = query.eq('is_featured', true)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: photos, error, count } = await query

    if (error) {
      console.error('Error fetching marketplace photos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      photos: photos || [],
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

