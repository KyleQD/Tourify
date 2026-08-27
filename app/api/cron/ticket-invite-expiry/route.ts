import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'
import { expireTicketInvites, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

async function run() {
  try {
    const result = await expireTicketInvites()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ ok: false, error: response.message }, { status: response.status })
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return run()
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return run()
}

