import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').optional(),
  description: z.string().optional(),
  venue_name: z.string().optional(),
  venue_id: z.string().uuid().optional(),
  venue_address: z.string().optional(),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  doors_open: z.string().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed']).optional(),
  capacity: z.number().int().min(0).optional(),
  tickets_sold: z.number().int().min(0).optional(),
  ticket_price: z.number().min(0).optional(),
  vip_price: z.number().min(0).optional(),
  expected_revenue: z.number().min(0).optional(),
  actual_revenue: z.number().min(0).optional(),
  expenses: z.number().min(0).optional(),
  venue_contact_name: z.string().optional(),
  venue_contact_email: z.string().email().optional(),
  venue_contact_phone: z.string().optional(),
  sound_requirements: z.string().optional(),
  lighting_requirements: z.string().optional(),
  stage_requirements: z.string().optional(),
  special_requirements: z.string().optional(),
  load_in_time: z.string().optional(),
  sound_check_time: z.string().optional()
})

function mapV2StatusFromLegacy(status?: string) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'scheduled' || normalized === 'draft') return 'inquiry'
  if (normalized === 'postponed') return 'hold'
  if (normalized === 'confirmed') return 'confirmed'
  if (normalized === 'in_progress') return 'onsite'
  if (normalized === 'completed') return 'settled'
  if (normalized === 'cancelled') return 'archived'
  if (['inquiry', 'hold', 'offer', 'confirmed', 'advancing', 'onsite', 'settled', 'archived'].includes(normalized)) {
    return normalized
  }
  return undefined
}

function mapEventV2ForLegacyResponse(event: any, tourId: string) {
  const settings = event.settings && typeof event.settings === 'object'
    ? (event.settings as Record<string, unknown>)
    : {}
  const startAt = typeof event.start_at === 'string' ? event.start_at : ''
  return {
    id: event.id,
    tour_id: tourId,
    name: event.title,
    description: typeof settings.description === 'string' ? settings.description : null,
    venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : null,
    venue_address: typeof settings.venue_address === 'string' ? settings.venue_address : null,
    event_date: startAt ? startAt.slice(0, 10) : null,
    event_time: startAt ? startAt.slice(11, 16) : null,
    status: event.status,
    capacity: event.capacity || 0,
    created_by: event.created_by,
    created_at: event.created_at,
    updated_at: event.updated_at || event.created_at,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    // Verify tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: link } = await supabase
      .from('tour_events')
      .select('event_id')
      .eq('tour_id', id)
      .eq('event_id', eventId)
      .maybeSingle()

    if (link?.event_id) {
      const { data: eventV2, error: eventV2Error } = await supabase
        .from('events_v2')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()
      if (eventV2Error) {
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
      }
      if (eventV2) {
        return NextResponse.json({ success: true, event: mapEventV2ForLegacyResponse(eventV2, id) })
      }
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tour_id', id)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

      return NextResponse.json({ success: true, event })
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)

    // Verify tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: link } = await supabase
      .from('tour_events')
      .select('event_id')
      .eq('tour_id', id)
      .eq('event_id', eventId)
      .maybeSingle()

    if (link?.event_id) {
      const { data: previousEvent } = await supabase
        .from('events_v2')
        .select('id, created_by, status, settings')
        .eq('id', eventId)
        .maybeSingle()
      if (!previousEvent) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const nextSettings = previousEvent.settings && typeof previousEvent.settings === 'object'
        ? { ...(previousEvent.settings as Record<string, unknown>) }
        : {}
      if (validatedData.description !== undefined) nextSettings.description = validatedData.description
      if (validatedData.venue_name !== undefined) nextSettings.venue_label = validatedData.venue_name
      if (validatedData.venue_address !== undefined) nextSettings.venue_address = validatedData.venue_address

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (validatedData.name !== undefined) updatePayload.title = validatedData.name
      if (validatedData.capacity !== undefined) updatePayload.capacity = validatedData.capacity
      const mappedStatus = mapV2StatusFromLegacy(validatedData.status)
      if (mappedStatus) updatePayload.status = mappedStatus

      if (validatedData.event_date || validatedData.event_time) {
        const datePart = validatedData.event_date || new Date().toISOString().slice(0, 10)
        const timePart = validatedData.event_time || '00:00'
        const parsed = Date.parse(`${datePart}T${timePart}:00`)
        if (!Number.isNaN(parsed)) updatePayload.start_at = new Date(parsed).toISOString()
      }
      updatePayload.settings = nextSettings

      const { data: updatedV2, error: updateV2Error } = await supabase
        .from('events_v2')
        .update(updatePayload)
        .eq('id', eventId)
        .select()
        .single()

      if (updateV2Error) {
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
      }

      if (
        previousEvent.created_by &&
        previousEvent.status !== 'settled' &&
        updatedV2.status === 'settled'
      ) {
        await achievementEngine.recordMetricEvent({
          supabase: supabase as any,
          userId: previousEvent.created_by,
          metricKey: 'events_completed_total',
          eventType: 'event_status_completed',
          delta: 1,
          eventSource: 'api_tour_event_patch',
          eventData: { event_id: eventId, tour_id: id }
        })
      }

      return NextResponse.json({ success: true, event: mapEventV2ForLegacyResponse(updatedV2, id) })
    }

    const { data: previousEvent } = await supabase
      .from('events')
      .select('id, artist_id, status')
      .eq('id', eventId)
      .eq('tour_id', id)
      .single()

    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('tour_id', id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    if (
      previousEvent?.artist_id &&
      previousEvent.status !== 'completed' &&
      updated.status === 'completed'
    ) {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: previousEvent.artist_id,
        metricKey: 'events_completed_total',
        eventType: 'event_status_completed',
        delta: 1,
        eventSource: 'api_tour_event_patch',
        eventData: { event_id: eventId, tour_id: id }
      })
    }

      return NextResponse.json({ success: true, event: updated })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    // Verify tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: link } = await supabase
      .from('tour_events')
      .select('event_id')
      .eq('tour_id', id)
      .eq('event_id', eventId)
      .maybeSingle()

    if (link?.event_id) {
      const { error: unlinkError } = await supabase
        .from('tour_events')
        .delete()
        .eq('tour_id', id)
        .eq('event_id', eventId)
      if (unlinkError) return NextResponse.json({ error: 'Failed to remove event link' }, { status: 500 })

      const { data: otherLinks } = await supabase
        .from('tour_events')
        .select('id')
        .eq('event_id', eventId)
        .limit(1)
      if (!otherLinks || otherLinks.length === 0) {
        await supabase.from('events_v2').delete().eq('id', eventId)
      }

      return NextResponse.json({ success: true, message: 'Event deleted successfully' })
    }

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('tour_id', id)

    if (deleteError) return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })

      return NextResponse.json({ success: true, message: 'Event deleted successfully' })
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}


