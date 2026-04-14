import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')

    let query = auth.supabase
      .from('venue_shifts')
      .select('*')
      .order('start_time', { ascending: true })

    if (venueId) query = query.eq('venue_id', venueId)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[Venue Shifts] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shifts: data || [] })
  } catch (error: any) {
    console.error('[Venue Shifts] GET exception:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { venue_id, title, start_time, end_time, ...rest } = body

    if (!venue_id || !title) {
      return NextResponse.json(
        { error: 'venue_id and title are required' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabase
      .from('venue_shifts')
      .insert({ venue_id, title, start_time, end_time, created_by: auth.user.id, ...rest })
      .select()
      .single()

    if (error) {
      console.error('[Venue Shifts] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shift: data }, { status: 201 })
  } catch (error: any) {
    console.error('[Venue Shifts] POST exception:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Shift id is required' }, { status: 400 })

    const { data, error } = await auth.supabase
      .from('venue_shifts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Venue Shifts] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shift: data })
  } catch (error: any) {
    console.error('[Venue Shifts] PUT exception:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Shift id is required' }, { status: 400 })

    const { error } = await auth.supabase
      .from('venue_shifts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Venue Shifts] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Venue Shifts] DELETE exception:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
