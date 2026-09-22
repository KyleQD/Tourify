import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  canUseArtistBookingChat,
  loadAuthorizedArtistBooking,
} from '@/lib/bookings/artist-booking-server'
import { bookingMessageSchema } from '@/lib/public-artist/booking-request-schema'

async function requireAcceptedParticipant(request: NextRequest, bookingId: string) {
  const context = await resolveActingContext(request)
  if (context instanceof NextResponse) return { response: context }
  const authorized = await loadAuthorizedArtistBooking(context, bookingId)
  if (!authorized) return { response: NextResponse.json({ error: 'Booking request not found.' }, { status: 404 }) }
  if (!canUseArtistBookingChat(authorized.role, authorized.row.status)) {
    return { response: NextResponse.json({ error: 'Chat unlocks after acceptance.' }, { status: 409 }) }
  }
  return { context }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorized = await requireAcceptedParticipant(request, id)
  if ('response' in authorized) return authorized.response

  const { data, error } = await authorized.context.supabase
    .from('booking_request_messages')
    .select('id, booking_request_id, sender_id, content, created_at')
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
    const authorized = await requireAcceptedParticipant(request, id)
    if ('response' in authorized) return authorized.response
    const body = bookingMessageSchema.parse(await request.json())

    const { data, error } = await authorized.context.supabase
      .from('booking_request_messages')
      .insert({
        booking_request_id: id,
        sender_id: authorized.context.userId,
        content: body.content,
      })
      .select('id, booking_request_id, sender_id, content, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Artist booking message failed:', error)
    return NextResponse.json({ error: 'Could not send this message.' }, { status: 500 })
  }
}
