import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { loadTicketWallet, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticketId = new URL(request.url).searchParams.get('ticket_id')
  try {
    return NextResponse.json(await loadTicketWallet({ userId: auth.user.id, ticketId }))
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}
