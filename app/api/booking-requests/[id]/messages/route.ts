import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  canRequesterAnswerInfoRequest,
  canUseArtistBookingChat,
  getArtistBookingService,
  loadAuthorizedArtistBooking,
} from '@/lib/bookings/artist-booking-server'
import { bookingMessageSchema } from '@/lib/public-artist/booking-request-schema'

async function requireMessageParticipant(request: NextRequest, bookingId: string) {
  const context = await resolveActingContext(request)
  if (context instanceof NextResponse) return { response: context }
  const authorized = await loadAuthorizedArtistBooking(context, bookingId)
  if (!authorized) return { response: NextResponse.json({ error: 'Booking request not found.' }, { status: 404 }) }
  if (!canUseArtistBookingChat(authorized.role, authorized.row.status)) {
    return { response: NextResponse.json({ error: 'Booking messages are unavailable for this request.' }, { status: 409 }) }
  }
  return { context, authorized }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorized = await requireMessageParticipant(request, id)
  if ('response' in authorized) return authorized.response

  const { data, error } = await authorized.context.supabase
    .from('booking_request_messages')
    .select('id, booking_request_id, sender_id, content, message_type, created_at')
    .eq('booking_request_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Could not load booking messages.' }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authorized = await requireMessageParticipant(request, id)
    if ('response' in authorized) return authorized.response
    const body = bookingMessageSchema.parse(await request.json())
    const isInfoResponse = canRequesterAnswerInfoRequest(
      authorized.authorized.role,
      authorized.authorized.row.status,
    )
    const messageType = isInfoResponse ? 'info_response' : 'message'

    const { data, error } = await authorized.context.supabase
      .from('booking_request_messages')
      .insert({
        booking_request_id: id,
        sender_id: authorized.context.userId,
        content: body.content,
        message_type: messageType,
      })
      .select('id, booking_request_id, sender_id, content, message_type, created_at')
      .single()

    if (error) throw error
    if (isInfoResponse) {
      const service = getArtistBookingService()
      await service
        .from('booking_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'needs_info')
        .eq('requester_id', authorized.context.userId)
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Artist booking message failed:', error)
    return NextResponse.json({ error: 'Could not send this message.' }, { status: 500 })
  }
}
