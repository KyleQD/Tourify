import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import {
  createAllocation,
  getTicketingActorAccess,
  releaseAllocation,
  resizeAllocation,
  ticketingErrorResponse,
} from '@/lib/ticketing/guest-list.server'

const createSchema = z.object({
  ticketTypeId: z.string().uuid(),
  managerUserId: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(10000),
  releaseAt: z.string().datetime().optional().nullable(),
  purpose: z.enum(['guest', 'artist_guest', 'staff', 'crew']).default('guest'),
  notes: z.string().trim().max(1000).optional().nullable(),
})

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('resize'), allocationId: z.string().uuid(), quantity: z.number().int().min(1), releaseAt: z.string().datetime().optional().nullable() }),
  z.object({ action: z.literal('release'), allocationId: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), allocationId: z.string().uuid() }),
])

async function requireManager(auth: any, eventId: string) {
  const access = await getTicketingActorAccess({ supabase: auth.supabase, userId: auth.user.id, eventId })
  if (!access.canManageGuestList) throw Object.assign(new Error('Only event ticketing administrators can change allocation capacity'), { status: 403 })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    await requireManager(auth, eventId)
    const body = createSchema.parse(await request.json())
    const allocation = await createAllocation({ ...body, eventId, actorUserId: auth.user.id })
    return NextResponse.json({ allocation }, { status: 201 })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    const status = (error as any)?.status || response.status
    return NextResponse.json({ error: response.message }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    await requireManager(auth, eventId)
    const body = patchSchema.parse(await request.json())
    const allocation = body.action === 'resize'
      ? await resizeAllocation({ allocationId: body.allocationId, quantity: body.quantity, releaseAt: body.releaseAt })
      : await releaseAllocation({ allocationId: body.allocationId, cancel: body.action === 'cancel' })
    return NextResponse.json({ allocation })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    const status = (error as any)?.status || response.status
    return NextResponse.json({ error: response.message }, { status })
  }
}

