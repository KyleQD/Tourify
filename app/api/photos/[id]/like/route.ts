import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photos/[id]/like
 * Like a photo
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

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('photo_likes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      return NextResponse.json(
        { error: 'Photo already liked' },
        { status: 400 }
      )
    }

    // Create like
    const { data: like, error } = await supabase
      .from('photo_likes')
      .insert({
        photo_id: photoId,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating like:', error)
      return NextResponse.json(
        { error: 'Failed to like photo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ like }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photos/[id]/like
 * Unlike a photo
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

    // Delete like
    const { error } = await supabase
      .from('photo_likes')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting like:', error)
      return NextResponse.json(
        { error: 'Failed to unlike photo' },
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

