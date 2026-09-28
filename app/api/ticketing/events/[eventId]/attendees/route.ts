import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { getTicketingActorAccess, listUnifiedAttendees, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    const access = await getTicketingActorAccess({ supabase: auth.supabase, userId: auth.user.id, eventId })
    if (!access.canViewAttendees) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const attendees = await listUnifiedAttendees({ eventId, includeContact: access.canViewContact })
    return NextResponse.json({ attendees })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

