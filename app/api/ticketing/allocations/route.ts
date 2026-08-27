import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { createAllocation, createInvite } from '@/lib/ticketing/guest-list.server'

const allocationSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid().optional().nullable(),
  allocation_type: z.enum(['artist', 'venue', 'organization', 'promoter', 'sponsor', 'staff', 'media', 'general']),
  account_type: z.string().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  label: z.string().min(1),
  quantity_total: z.number().int().min(0),
  notes: z.string().optional().nullable(),
  release_at: z.string().datetime().optional().nullable(),
})

const issueSchema = z.object({
  allocation_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  recipient_user_id: z.string().uuid().optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  recipient_name: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = new URL(request.url).searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const allowed = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'manage_guestlist',
  }) || await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'issue_comps',
  }) || await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_overview',
  })

  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('ticket_allocations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ allocations: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const action = body.action || 'create'
  const supabase = await createClient()

  if (action === 'create') {
    const parsed = allocationSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'manage_guestlist',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!parsed.ticket_type_id)
      return NextResponse.json({ error: 'ticket_type_id is required for reserved allocations' }, { status: 400 })
    const purpose = parsed.allocation_type === 'artist'
      ? 'artist_guest'
      : parsed.allocation_type === 'staff' ? 'staff' : 'guest'
    const allocation = await createAllocation({
      eventId: parsed.event_id,
      ticketTypeId: parsed.ticket_type_id,
      managerUserId: parsed.account_id || auth.user.id,
      label: parsed.label,
      quantity: parsed.quantity_total,
      releaseAt: parsed.release_at,
      purpose,
      notes: parsed.notes,
      actorUserId: auth.user.id,
    })
    return NextResponse.json({ allocation, deprecated: true }, { status: 201 })
  }

  if (action === 'issue') {
    const parsed = issueSchema.parse(body)
    const { data: allocation } = await supabase
      .from('ticket_allocations')
      .select('*')
      .eq('id', parsed.allocation_id)
      .maybeSingle()

    if (!allocation)
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
    const allocationRow = allocation as any

    if (parsed.quantity !== 1)
      return NextResponse.json({ error: 'Each admission now requires one invitation and one Tourify account' }, { status: 400 })

    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: allocation.event_id,
      permission: 'issue_comps',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!parsed.recipient_user_id && !parsed.recipient_email)
      return NextResponse.json({ error: 'recipient_user_id or recipient_email is required' }, { status: 400 })
    const result = await createInvite({
      eventId: allocationRow.event_id,
      allocationId: allocationRow.id,
      recipientUserId: parsed.recipient_user_id,
      recipientEmail: parsed.recipient_email,
      recipientName: parsed.recipient_name,
      purpose: allocationRow.purpose || (allocationRow.allocation_type === 'artist' ? 'artist_guest' : 'guest'),
      expiresAt: allocationRow.release_at,
      actorUserId: auth.user.id,
    })
    return NextResponse.json({ invitation: result, deprecated: true }, { status: 202 })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
