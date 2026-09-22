import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { declineInvite, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { token } = await params
    return NextResponse.json({ invitation: await declineInvite({ token, userId: auth.user.id, verifiedEmail: auth.user.email || null }) })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

