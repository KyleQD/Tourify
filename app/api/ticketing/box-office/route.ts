import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { getStripeOrNull } from '@/lib/stripe'
import { createPendingOrder } from '@/lib/ticketing/orders'

const sellSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  buyer_name: z.string().min(1),
  buyer_email: z.string().email(),
  buyer_user_id: z.string().uuid().optional().nullable(),
  payment_method: z.enum(['card', 'cash', 'comp']).default('card'),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  const q = searchParams.get('q')?.trim()
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const allowed = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'operate_box_office',
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let ordersQuery = supabase
    .from('ticket_sales')
    .select('id, order_number, buyer_name, buyer_email, quantity, total_amount, payment_status, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(50)

  let ticketsQuery = supabase
    .from('tickets')
    .select('id, owner_name, owner_email, status, ticket_types(name), order_id')
    .eq('event_id', eventId)
    .order('issued_at', { ascending: false })
    .limit(50)

  if (q) {
    ordersQuery = ordersQuery.or(`buyer_email.ilike.%${q}%,buyer_name.ilike.%${q}%,order_number.ilike.%${q}%`)
    ticketsQuery = ticketsQuery.or(`owner_email.ilike.%${q}%,owner_name.ilike.%${q}%`)
  }

  const [{ data: orders }, { data: tickets }] = await Promise.all([ordersQuery, ticketsQuery])
  return NextResponse.json({ orders: orders || [], tickets: tickets || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const action = body.action || 'sell'
  const supabase = await createClient()
  const service = createServiceRoleClient()

  if (action === 'sell') {
    const parsed = sellSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'operate_box_office',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', parsed.ticket_type_id)
      .maybeSingle()

    if (!ticketType)
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })

    if (parsed.payment_method === 'comp') {
      const pending = await createPendingOrder({
        supabase: service as any,
        ticketTypeId: parsed.ticket_type_id,
        eventId: parsed.event_id,
        quantity: parsed.quantity,
        unitPrice: 0,
        buyerUserId: parsed.buyer_user_id ?? null,
        buyerName: parsed.buyer_name,
        buyerEmail: parsed.buyer_email,
        metadata: { box_office: true, payment_method: 'comp', sold_by: auth.user.id },
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
          const { finalizeInventory } = await import('@/lib/ticketing/inventory')
          await finalizeInventory({ supabase: service as any, reservationId: pending.reservationId })
        } catch {
          // continue
        }
      }

      const { issueTicketsForOrder } = await import('@/lib/ticketing/issuance')
      const issued = await issueTicketsForOrder({
        supabase: service as any,
        orderId: pending.orderId,
        eventId: parsed.event_id,
        ticketTypeId: parsed.ticket_type_id,
        quantity: parsed.quantity,
        unitPrice: 0,
        ownerUserId: parsed.buyer_user_id ?? null,
        ownerEmail: parsed.buyer_email,
        ownerName: parsed.buyer_name,
        isComplimentary: true,
        actorUserId: auth.user.id,
      })

      return NextResponse.json({
        order_id: pending.orderId,
        order_number: pending.orderNumber,
        tickets: issued,
        status: 'completed',
      }, { status: 201 })
    }

    const pending = await createPendingOrder({
      supabase: service as any,
      ticketTypeId: parsed.ticket_type_id,
      eventId: parsed.event_id,
      quantity: parsed.quantity,
      unitPrice: Number(ticketType.price),
      buyerUserId: parsed.buyer_user_id ?? null,
      buyerName: parsed.buyer_name,
      buyerEmail: parsed.buyer_email,
      metadata: { box_office: true, payment_method: parsed.payment_method, sold_by: auth.user.id },
    })

    const stripe = getStripeOrNull()
    if (parsed.payment_method === 'card' && stripe) {
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: parsed.buyer_email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(pending.fees.buyerTotal * 100),
              product_data: { name: ticketType.name },
            },
            quantity: 1,
          },
        ],
        metadata: {
          sale_id: pending.orderId,
          order_id: pending.orderId,
          order_number: pending.orderNumber,
          box_office: 'true',
        },
        success_url: `${origin}/admin/dashboard/events/${parsed.event_id}?tab=tickets&box_office=1`,
        cancel_url: `${origin}/admin/dashboard/events/${parsed.event_id}?tab=tickets&box_office=1&cancelled=1`,
      })

      await service
        .from('ticket_sales')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', pending.orderId)

      return NextResponse.json({
        order_id: pending.orderId,
        order_number: pending.orderNumber,
        checkout_url: session.url,
      }, { status: 201 })
    }

    // Cash — mark completed and rely on webhook-equivalent finalize manually via service
    await service
      .from('ticket_sales')
      .update({
        payment_status: 'completed',
        payment_method: 'cash',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pending.orderId)

    const { finalizePaidOrder } = await import('@/lib/ticketing/finalize')
    await finalizePaidOrder({
      supabase: service as any,
      orderId: pending.orderId,
      stripeEventId: `cash_${pending.orderId}`,
    })

    return NextResponse.json({
      order_id: pending.orderId,
      order_number: pending.orderNumber,
      status: 'completed',
    }, { status: 201 })
  }

  if (action === 'refund') {
    return NextResponse.json({
      error: 'Box-office refunds now run through the admin refund endpoint.',
      code: 'USE_ADMIN_REFUND',
      execute_via: '/api/admin/ticketing/refund',
      expected_body: {
        sale_id: 'uuid',
        reason: 'required',
        ticket_ids: 'optional uuid[]',
      },
    }, {
      status: 409,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
