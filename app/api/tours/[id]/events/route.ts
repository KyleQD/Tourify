import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  venue_id: z.string().uuid().optional(),
  start_at: z.string().min(1, 'Start date is required'),
  end_at: z.string().optional(),
  status: z.enum(['inquiry', 'hold', 'offer', 'confirmed', 'advancing', 'onsite', 'settled', 'archived']).default('inquiry'),
  capacity: z.number().min(1).optional(),
  settings: z.record(z.any()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { supabase }) => {
    try {

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    const { data: tourEvents, error: teError } = await supabase
      .from('tour_events')
      .select(`
        id,
        ordinal,
        event_id,
        events_v2 (
          id,
          org_id,
          venue_id,
          title,
          slug,
          status,
          start_at,
          end_at,
          timezone,
          capacity,
          settings,
          created_at,
          updated_at
        )
      `)
      .eq('tour_id', id)
      .order('ordinal', { ascending: true })

    if (teError) {
      console.error('[Tour Events API] Error fetching tour_events:', teError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const events = (tourEvents || []).map((te: any) => ({
      ...te.events_v2,
      tour_event_id: te.id,
      ordinal: te.ordinal,
    }))

      return NextResponse.json({
        success: true,
        events,
        message: 'Tour events fetched successfully'
      })

    } catch (error) {
      console.error('[Tour Events API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    const body = await request.json()
    const validatedData = createEventSchema.parse(body)

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    const orgId = tour.org_id
    const slugBase = validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'event'
    const slug = `${slugBase}-${Date.now().toString(36)}`

    const endAt = validatedData.end_at
      ? new Date(validatedData.end_at).toISOString()
      : new Date(new Date(validatedData.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString()

    const { data: event, error: eventError } = await supabase
      .from('events_v2')
      .insert({
        org_id: orgId,
        venue_id: validatedData.venue_id || null,
        title: validatedData.title,
        slug,
        status: validatedData.status,
        start_at: new Date(validatedData.start_at).toISOString(),
        end_at: endAt,
        capacity: validatedData.capacity || null,
        settings: validatedData.settings || { description: validatedData.description || '' },
        created_by: user.id,
      })
      .select()
      .single()

    if (eventError) {
      console.error('[Tour Events API] Error creating event in events_v2:', eventError)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    const { data: existing } = await supabase
      .from('tour_events')
      .select('ordinal')
      .eq('tour_id', id)
      .order('ordinal', { ascending: false })
      .limit(1)

    const nextOrdinal = existing && existing.length > 0 ? (existing[0].ordinal ?? 0) + 1 : 0

    const { error: linkError } = await supabase
      .from('tour_events')
      .insert({
        tour_id: id,
        event_id: event.id,
        ordinal: nextOrdinal,
      })

    if (linkError) {
      console.error('[Tour Events API] Error linking event to tour:', linkError)
    }

      return NextResponse.json({
        success: true,
        event,
        message: 'Event created and linked to tour successfully'
      })

    } catch (error) {
      console.error('[Tour Events API] Error:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}
