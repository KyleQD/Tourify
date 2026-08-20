import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { fromZodError, requireApiUser } from '@/lib/api/route-helpers'
import { runPromoterMembershipCommand, PromoterMembershipCommandError } from '@/lib/promoter-network/membership-command'

function invitationId(request: NextRequest) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  return z.string().uuid().parse(segments[segments.lastIndexOf('invitations') + 1])
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response
  try {
    const id = invitationId(request)
    const { data: invitation, error } = await auth.auth.supabase
      .from('event_promoter_applications')
      .select('id, program_id, user_id, source, status')
      .eq('id', id)
      .eq('user_id', auth.auth.user.id)
      .maybeSingle()
    if (error || !invitation) return NextResponse.json({ error: { code: 'invitation_not_found', message: 'Invitation not found.', retryable: false } }, { status: 404 })
    const data = await runPromoterMembershipCommand({
      actorUserId: auth.auth.user.id,
      action: 'accept_invitation',
      programId: invitation.program_id,
      applicationId: invitation.id,
    })
    return NextResponse.json({ data })
  } catch (error) {
    const zod = fromZodError(error, 'Invalid invitation id.')
    if (zod) return zod
    if (error instanceof PromoterMembershipCommandError) {
      return NextResponse.json({ error: { code: error.code, message: error.message, retryable: false } }, { status: error.status })
    }
    return NextResponse.json({ error: { code: 'invitation_unavailable', message: 'Unable to accept invitation.', retryable: true } }, { status: 503 })
  }
}
