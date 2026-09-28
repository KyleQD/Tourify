import { NextRequest, NextResponse } from 'next/server'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { getInvitePreview, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  try {
    const { token } = await params
    return NextResponse.json({ invitation: await getInvitePreview(token) })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

