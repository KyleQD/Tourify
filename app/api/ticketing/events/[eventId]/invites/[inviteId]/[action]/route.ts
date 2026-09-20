import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  replaceInvite,
  requireAllocationManager,
  resendInvite,
  revokeInvite,
  ticketingErrorResponse,
} from '@/lib/ticketing/guest-list.server'

const replaceSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().trim().max(160).optional().nullable(),
  expiresAt: z.string().datetime(),
  doorOverride: z.boolean().optional(),
}).refine((value) => value.userId || value.email, 'A Tourify user or email is required')

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; inviteId: string; action: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId, inviteId, action } = await params
    if (!['resend', 'revoke', 'replace'].includes(action)) return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
    const service = createServiceRoleClient()
    const { data: invite } = await service.from('ticket_invites').select('allocation_id').eq('id', inviteId).eq('event_id', eventId).maybeSingle()
    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    const access = await requireAllocationManager({ supabase: auth.supabase, userId: auth.user.id, eventId, allocationId: invite.allocation_id })
    const rawBody = action === 'resend' ? {} : await request.json().catch(() => ({}))
    if (action === 'resend') return NextResponse.json(await resendInvite({ inviteId }))
    if (action === 'revoke') {
      const doorOverride = z.object({ doorOverride: z.boolean().optional() }).parse(rawBody).doorOverride
      if (doorOverride && !access.canScan) return NextResponse.json({ error: 'Door override permission required' }, { status: 403 })
      return NextResponse.json({ invite: await revokeInvite({ inviteId, actorUserId: auth.user.id, doorOverride }) })
    }
    const body = replaceSchema.parse(rawBody)
    if (body.doorOverride && !access.canScan) return NextResponse.json({ error: 'Door override permission required' }, { status: 403 })
    return NextResponse.json(await replaceInvite({
      inviteId,
      recipientUserId: body.userId,
      recipientEmail: body.email,
      recipientName: body.name,
      expiresAt: body.expiresAt,
      actorUserId: auth.user.id,
      doorOverride: body.doorOverride,
    }))
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

