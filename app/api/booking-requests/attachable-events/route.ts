import { NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { listArtistBookingAttachableEvents } from '@/lib/bookings/artist-booking-server'

export async function GET(request: NextRequest) {
  try {
    const context = await resolveActingContext(request)
    if (context instanceof NextResponse) return context

    const events = await listArtistBookingAttachableEvents(context)
    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('Attachable booking events failed:', error)
    return NextResponse.json({ error: 'Could not load your events.' }, { status: 500 })
  }
}
