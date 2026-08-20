import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  canDecideArtistBooking,
  getArtistBookingService,
  linkAcceptedArtistBookingToEvent,
  loadAuthorizedArtistBooking,
  serializeArtistBooking,
} from '@/lib/bookings/artist-booking-server'
import { bookingDecisionSchema } from '@/lib/public-artist/booking-request-schema'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveActingContext(request)
    if (context instanceof NextResponse) return context

    const { id } = await params
    const body = bookingDecisionSchema.parse(await request.json())
    if (body.decision === 'needs_info' && !body.note?.trim()) {
      return NextResponse.json({ error: 'Add a note describing the information you need.' }, { status: 400 })
    }
    const authorized = await loadAuthorizedArtistBooking(context, id)
    if (!authorized) return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 })
    if (authorized.role !== 'artist') {
      return NextResponse.json({ error: 'Only the requested artist can respond.' }, { status: 403 })
    }
    if (!canDecideArtistBooking(authorized.role, authorized.row.status)) {
      return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const service = getArtistBookingService()
    const updatePayload = {
      status: body.decision,
      response_message: body.decision === 'declined' ? body.note || null : null,
      accepted_at: body.decision === 'accepted' ? now : null,
      declined_at: body.decision === 'declined' ? now : null,
      updated_at: now,
    }

    const { data, error } = await service
      .from('booking_requests')
      .update(updatePayload)
      .eq('id', id)
      .eq('artist_id', context.userId)
      .in('status', ['pending', 'needs_info'])
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 })

    if (body.decision === 'needs_info') {
      await service.from('booking_request_messages').insert({
        booking_request_id: id,
        sender_id: context.userId,
        content: body.note,
        message_type: 'info_request',
      })
    }

    let linked = data
    if (body.decision === 'accepted') {
      const collaborationStatus = await linkAcceptedArtistBookingToEvent(data, context.userId)
      if (collaborationStatus !== 'not_linked') {
        const { data: refreshed } = await service
          .from('booking_requests')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (refreshed) linked = refreshed
      }

      await achievementEngine.recordMetricEvent({
        supabase: service as any,
        userId: context.userId,
        metricKey: 'bookings_accepted_total',
        eventType: 'booking_request_accepted',
        delta: 1,
        eventSource: 'api_artist_booking_decision',
        eventData: { booking_request_id: id },
      })
    }

    return NextResponse.json({ success: true, data: await serializeArtistBooking(linked, context) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Artist booking decision failed:', error)
    return NextResponse.json({ error: 'Could not update this booking request.' }, { status: 500 })
  }
}
