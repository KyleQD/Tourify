import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { createInvite, requireAllocationManager, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'

const recipientSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().trim().max(160).optional().nullable(),
  sourceType: z.string().trim().max(40).optional().nullable(),
  sourceId: z.string().uuid().optional().nullable(),
}).refine((value) => value.userId || value.email, 'A Tourify user or email is required')

const schema = z.object({
  allocationId: z.string().uuid(),
  purpose: z.enum(['guest', 'artist_guest', 'staff', 'crew']),
  expiresAt: z.string().datetime(),
  recipients: z.array(recipientSchema).min(1).max(100),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    const body = schema.parse(await request.json())
    await requireAllocationManager({ supabase: auth.supabase, userId: auth.user.id, eventId, allocationId: body.allocationId })
    const results = []
    for (const recipient of body.recipients) {
      results.push(await createInvite({
        eventId,
        allocationId: body.allocationId,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        purpose: body.purpose,
        expiresAt: body.expiresAt,
        sourceType: recipient.sourceType,
        sourceId: recipient.sourceId,
        actorUserId: auth.user.id,
      }))
    }
    return NextResponse.json({ invitations: results }, { status: 201 })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

