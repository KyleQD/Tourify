import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { createPendingOrder } from '@/lib/ticketing/orders'
import { issueTicketsForOrder } from '@/lib/ticketing/issuance'
import { finalizeInventory } from '@/lib/ticketing/inventory'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { notifyCompIssued } from '@/lib/ticketing/notifications'

const allocationSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid().optional().nullable(),
  allocation_type: z.enum(['artist', 'venue', 'organization', 'promoter', 'sponsor', 'staff', 'media', 'general']),
  account_type: z.string().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  label: z.string().min(1),
  quantity_total: z.number().int().min(0),
  notes: z.string().optional().nullable(),
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
  const service = createServiceRoleClient()

  if (action === 'create') {
    const parsed = allocationSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'manage_guestlist',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('ticket_allocations')
      .insert({
        ...parsed,
        created_by: auth.user.id,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ allocation: data }, { status: 201 })
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

    const remaining = allocation.quantity_total - allocation.quantity_issued
    if (parsed.quantity > remaining)
      return NextResponse.json({ error: `Only ${remaining} remaining in allocation` }, { status: 400 })

    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: allocation.event_id,
      permission: 'issue_comps',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', parsed.ticket_type_id)
      .maybeSingle()

    if (!ticketType)
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })

    const pending = await createPendingOrder({
      supabase: service as any,
      ticketTypeId: parsed.ticket_type_id,
      eventId: allocation.event_id,
      quantity: parsed.quantity,
      unitPrice: 0,
      buyerUserId: parsed.recipient_user_id ?? null,
      buyerName: parsed.recipient_name || 'Guest',
      buyerEmail: parsed.recipient_email || auth.user.email || 'guest@tourify.app',
      discountAmount: 0,
      metadata: { complimentary: true, allocation_id: allocation.id },
    })

    await service
      .from('ticket_sales')
      .update({
        payment_status: 'completed',
        payment_method: 'complimentary',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pending.orderId)

    if (pending.reservationId) {
      try {
        await finalizeInventory({ supabase: service as any, reservationId: pending.reservationId })
      } catch {
        // comps may use zero-price types with dedicated inventory
      }
    }

    const issued = await issueTicketsForOrder({
      supabase: service as any,
      orderId: pending.orderId,
      eventId: allocation.event_id,
      ticketTypeId: parsed.ticket_type_id,
      quantity: parsed.quantity,
      unitPrice: 0,
      ownerUserId: parsed.recipient_user_id ?? null,
      ownerEmail: parsed.recipient_email ?? null,
      ownerName: parsed.recipient_name ?? null,
      isComplimentary: true,
      allocationId: allocation.id,
      actorUserId: auth.user.id,
    })

    await emitTicketAnalyticsEvent({
      supabase: service as any,
      eventName: 'complimentary_ticket_issued',
      eventId: allocation.event_id,
      ticketTypeId: parsed.ticket_type_id,
      orderId: pending.orderId,
      actorUserId: auth.user.id,
      amounts: { quantity: parsed.quantity },
      attribution: { allocation_id: allocation.id, allocation_type: allocation.allocation_type },
    })

    if (parsed.recipient_user_id) {
      await notifyCompIssued({
        userId: parsed.recipient_user_id,
        ticketId: issued[0]?.ticketId,
      })
    }

    return NextResponse.json({ order_id: pending.orderId, tickets: issued }, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
