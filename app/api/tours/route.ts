import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createTourSchema = z.object({
  name: z.string().min(1, 'Tour name is required'),
  description: z.string().optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  transportation: z.string().optional(),
  accommodation: z.string().optional(),
  equipment_requirements: z.string().optional(),
  crew_size: z.number().int().min(0, 'Crew size must be non-negative').optional(),
})

export const GET = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    console.log('[Tours API] GET request started')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('[Tours API] Fetching tours for user:', user.id)

    // Build query to fetch tours
    let query = supabase
      .from('tours')
      .select('*')
      .eq('user_id', user.id) // Use user_id instead of artist_id
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: tours, error: toursError } = await query

    if (toursError) {
      console.error('[Tours API] Error fetching tours:', toursError)
      // Return empty array instead of error if table doesn't exist
      if (toursError.code === '42P01') {
        console.log('[Tours API] Tours table does not exist, returning empty array')
        return NextResponse.json({ 
          success: true, 
          tours: [],
          message: 'No tours found' 
        })
      }
      return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 })
    }

    const safeTours = tours || []
    const tourIds = safeTours.map((tour: any) => tour.id)
    let eventsByTour = new Map<string, any[]>()
    if (tourIds.length > 0) {
      const { data: links } = await supabase
        .from('tour_events')
        .select(`
          tour_id,
          ordinal,
          events_v2 (
            id,
            title,
            status,
            start_at,
            settings
          )
        `)
        .in('tour_id', tourIds)
        .order('ordinal', { ascending: true })

      for (const link of links || []) {
        const event = link.events_v2
        if (!event) continue
        const settings = event.settings && typeof event.settings === 'object'
          ? (event.settings as Record<string, unknown>)
          : {}
        const mappedEvent = {
          id: event.id,
          name: event.title,
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
          status: event.status,
          venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : 'Venue',
        }
        const existing = eventsByTour.get(link.tour_id) || []
        existing.push(mappedEvent)
        eventsByTour.set(link.tour_id, existing)
      }
    }

    const toursWithEvents = safeTours.map((tour: any) => ({
      ...tour,
      events: eventsByTour.get(tour.id) || [],
    }))

    console.log('[Tours API] Successfully fetched tours:', toursWithEvents.length)

    return NextResponse.json({ 
      success: true, 
      tours: toursWithEvents,
      message: 'Tours fetched successfully' 
    })

  } catch (error) {
    console.error('[Tours API] Error:', error)
    return NextResponse.json({ 
      success: true, 
      tours: [],
      message: 'Error occurred while fetching tours' 
    })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    console.log('[Tours API] POST request started')

    const body = await request.json()
    const validatedData = createTourSchema.parse(body)

    console.log('[Tours API] Creating tour with data:', validatedData)

    // Create the tour
    const tourData = {
      ...validatedData,
      user_id: user.id, // Use user_id instead of artist_id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert(tourData)
      .select('*')
      .single()

    if (tourError) {
      console.error('[Tours API] Error creating tour:', tourError)
      return NextResponse.json({ error: 'Failed to create tour' }, { status: 500 })
    }

    console.log('[Tours API] Tour created successfully:', tour.id)

    // Create a default event linked via tour_events for immediate calendar visibility
    let createdDefaultEvent = false
    if (tour.org_id) {
      const slug = `${tour.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)}-${Date.now().toString(36)}`
      const startAt = new Date(`${validatedData.start_date}T19:00:00`).toISOString()
      const endAt = new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()

      const { data: eventV2, error: eventV2Error } = await supabase
        .from('events_v2')
        .insert({
          org_id: tour.org_id,
          venue_id: null,
          title: `${tour.name} - Tour Event`,
          slug,
          status: 'inquiry',
          start_at: startAt,
          end_at: endAt,
          capacity: 0,
          settings: { description: `Default event for ${tour.name}`, venue_label: 'TBD' },
          created_by: user.id,
        })
        .select('id')
        .single()

      if (!eventV2Error && eventV2?.id) {
        const { error: linkError } = await supabase
          .from('tour_events')
          .insert({ tour_id: tour.id, event_id: eventV2.id, ordinal: 0 })
        if (!linkError) createdDefaultEvent = true
      } else {
        console.error('[Tours API] Error creating default events_v2 event:', eventV2Error)
      }
    }

    if (createdDefaultEvent) {
      await supabase
        .from('tours')
        .update({ total_shows: 1 })
        .eq('id', tour.id)
    }

    return NextResponse.json({ 
      success: true, 
      tour,
      message: 'Tour created successfully' 
    })

  } catch (error) {
    console.error('[Tours API] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})