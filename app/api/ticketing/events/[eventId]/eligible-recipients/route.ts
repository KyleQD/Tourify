import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { getTicketingActorAccess, listEligibleRecipients, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

const kindSchema = z.enum(['artist', 'staff', 'user'])

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    const url = new URL(request.url)
    const kind = kindSchema.parse(url.searchParams.get('kind') || 'artist')
    await getTicketingActorAccess({ supabase: auth.supabase, userId: auth.user.id, eventId })
    const recipients = await listEligibleRecipients({ eventId, kind, query: url.searchParams.get('q') || undefined })
    return NextResponse.json({ recipients })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

