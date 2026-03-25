import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/photos/albums
 * Fetch photo albums for the current user or public albums
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isPublic = searchParams.get('public') === 'true'
    const eventId = searchParams.get('eventId')
    const featured = searchParams.get('featured') === 'true'
    
    let query = supabase
      .from('photo_albums')
      .select(`
        *,
        photos!photo_albums_cover_photo_id_fkey (
          id,
          thumbnail_url,
          preview_url
        )
      `)

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    } else if (isPublic) {
      query = query.eq('is_public', true)
    } else {
      // Default: show user's own albums
      query = query.eq('user_id', user.id)
    }

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (featured) {
      query = query.eq('is_featured', true)
    }

    query = query.order('created_at', { ascending: false })

    const { data: albums, error } = await query

    if (error) {
      console.error('Error fetching albums:', error)
      return NextResponse.json(
        { error: 'Failed to fetch albums' },
        { status: 500 }
      )
    }

    return NextResponse.json({ albums })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/photos/albums
 * Create a new photo album
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
      title,
      description,
      category,
      tags,
      isPublic,
      isFeatured,
      eventId,
      accountType
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!accountType) {
      return NextResponse.json(
        { error: 'Account type is required' },
        { status: 400 }
      )
    }

    // Create album
    const { data: album, error } = await supabase
      .from('photo_albums')
      .insert({
        user_id: user.id,
        account_type: accountType,
        title,
        description,
        category,
        tags: tags || [],
        is_public: isPublic !== undefined ? isPublic : true,
        is_featured: isFeatured !== undefined ? isFeatured : false,
        event_id: eventId || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating album:', error)
      return NextResponse.json(
        { error: 'Failed to create album' },
        { status: 500 }
      )
    }

    return NextResponse.json({ album }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

