import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  canEditArtistBookingDetails,
  getArtistBookingService,
  loadAuthorizedArtistBooking,
  normalizeArtistBookingDetails,
  serializeArtistBooking,
} from '@/lib/bookings/artist-booking-server'
import { bookingDeferredDetailsSchema } from '@/lib/public-artist/booking-request-schema'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveActingContext(request)
    if (context instanceof NextResponse) return context

    const { id } = await params
    const details = bookingDeferredDetailsSchema.parse(await request.json())
    const authorized = await loadAuthorizedArtistBooking(context, id)
    if (!authorized) return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 })
    if (authorized.role !== 'requester') {
      return NextResponse.json({ error: 'Only the requester can edit booking details.' }, { status: 403 })
    }
    if (!canEditArtistBookingDetails(authorized.role, authorized.row.status)) {
      return NextResponse.json({ error: 'Details unlock after the artist accepts.' }, { status: 409 })
    }

    const current = normalizeArtistBookingDetails(authorized.row.booking_details)
    const now = new Date().toISOString()
    const service = getArtistBookingService()
    const { data, error } = await service
      .from('booking_requests')
      .update({
        booking_details: {
          ...current,
          description: details.description,
          compensation: details.compensation,
          additionalNotes: details.additionalNotes,
        },
        email: details.email || null,
        phone: details.phone || null,
        details_updated_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('requester_id', context.userId)
      .eq('status', 'accepted')
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Booking details are no longer editable.' }, { status: 409 })
    return NextResponse.json({ success: true, data: await serializeArtistBooking(data, context) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Artist booking details update failed:', error)
    return NextResponse.json({ error: 'Could not save booking details.' }, { status: 500 })
  }
}
