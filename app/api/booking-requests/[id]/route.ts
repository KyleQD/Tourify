import { NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  loadAuthorizedArtistBooking,
  serializeArtistBooking,
} from '@/lib/bookings/artist-booking-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveActingContext(request)
  if (context instanceof NextResponse) return context

  const { id } = await params
  const authorized = await loadAuthorizedArtistBooking(context, id)
  if (!authorized) return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 })

  const booking = await serializeArtistBooking(authorized.row, context)
  if (!booking) return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 })
  return NextResponse.json({ success: true, data: booking })
}
