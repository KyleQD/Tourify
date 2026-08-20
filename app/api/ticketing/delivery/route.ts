import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'
import { buildAppUrl, createTicketClaimLink } from '@/lib/ticketing/claim-links'

const stripe = getStripeOrNull()

async function loadPurchase(sessionId: string) {
  if (!stripe) return { error: 'Payment service not configured', status: 503 as const }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (!session) return { error: 'Session not found', status: 404 as const }

  const saleId = session.metadata?.sale_id || session.metadata?.order_id
  if (!saleId) return { error: 'Sale ID not found in session', status: 400 as const }

  const supabase = createServiceRoleClient()
  const { data: sale, error: saleError } = await supabase
    .from('ticket_sales')
    .select(`
      *,
      ticket_types:ticket_type_id (name, price),
      events_v2:event_id (title, start_at, org_id)
    `)
    .eq('id', saleId)
    .single()

  if (saleError || !sale) return { error: 'Sale not found', status: 404 as const }
  if (session.payment_status !== 'paid') return { error: 'Payment not completed', status: 400 as const }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_credentials(token, status)')
    .eq('order_id', saleId)

  return { sale, session, tickets: tickets || [] }
}

async function createManageUrl(sale: Record<string, any>) {
  if (sale.buyer_user_id) return buildAppUrl(`/tickets/orders/${sale.id}`)

  const event = sale.events_v2 || sale.events || {}
  const claim = await createTicketClaimLink({
    supabase: createServiceRoleClient() as any,
    orgId: event.org_id ?? sale.org_id ?? null,
    eventId: sale.event_id,
    orderId: sale.id,
    recipientEmail: sale.buyer_email || sale.customer_email || null,
    purpose: 'claim',
    ttlHours: 168,
    metadata: { source: 'delivery' },
  })
  return claim.url
}

async function recordDeliveryAttempt(params: {
  sale: Record<string, any>
  channel: 'email' | 'download' | 'claim_link'
  status: 'sent' | 'failed' | 'resent' | 'queued'
  manageUrl?: string | null
  provider?: string | null
  providerMessageId?: string | null
  error?: string | null
  idempotencyKey?: string | null
}) {
  const event = params.sale.events_v2 || {}
  await createServiceRoleClient().from('ticket_delivery_attempts').insert({
    org_id: event.org_id ?? params.sale.org_id ?? null,
    event_id: params.sale.event_id,
    order_id: params.sale.id,
    recipient_email: params.sale.buyer_email || params.sale.customer_email || null,
    delivery_channel: params.channel,
    status: params.status,
    provider: params.provider ?? null,
    provider_message_id: params.providerMessageId ?? null,
    error: params.error ?? null,
    manage_url: params.manageUrl ?? null,
    idempotency_key: params.idempotencyKey ?? null,
  })
}

function buildTicketText(sale: Record<string, any>, manageUrl: string) {
  const event = sale.events_v2 || sale.events || {}
  const lines = [
    'TOURIFY TICKET CONFIRMATION',
    '===========================',
    `Order: ${sale.order_number || (sale.metadata as any)?.order_number || sale.id}`,
    `Customer: ${sale.buyer_name || sale.customer_name || ''}`,
    `Email: ${sale.buyer_email || sale.customer_email || ''}`,
    `Event: ${event.title || 'Event'}`,
    `Date: ${event.start_at || event.date || 'TBD'}`,
    `Ticket Type: ${sale.ticket_types?.name || 'General Admission'}`,
    `Quantity: ${sale.quantity}`,
    `Total: $${Number(sale.total_amount || 0).toFixed(2)}`,
    '',
    'Manage tickets and view QR codes:',
    manageUrl,
  ]

  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    const result = await loadPurchase(sessionId)
    if ('error' in result && result.error)
      return NextResponse.json({ error: result.error }, { status: result.status })

    const manageUrl = await createManageUrl(result.sale)
    const ticketText = buildTicketText(result.sale, manageUrl)
    await recordDeliveryAttempt({
      sale: result.sale,
      channel: result.sale.buyer_user_id ? 'download' : 'claim_link',
      status: 'sent',
      manageUrl,
      idempotencyKey: `delivery:${result.sale.id}:download`,
    })
    return new NextResponse(ticketText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="tickets-${result.sale.order_number || result.sale.id}.txt"`,
      },
    })
  } catch (error) {
    console.error('[Ticket Delivery API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = body.session_id as string | undefined
    if (!sessionId) return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    const result = await loadPurchase(sessionId)
    if ('error' in result && result.error)
      return NextResponse.json({ error: result.error }, { status: result.status })

    const recipient = result.sale.buyer_email || result.sale.customer_email
    if (!recipient) return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })

    const event = result.sale.events_v2 || {}
    const manageUrl = await createManageUrl(result.sale)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const ticketText = buildTicketText(result.sale, manageUrl)
      let deliveryStatus: 'sent' | 'failed' = 'sent'
      let deliveryError: string | null = null

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.TICKET_EMAIL_FROM || 'tickets@tourify.live',
          to: recipient,
          subject: `Your tickets for ${event.title || 'your event'}`,
          text: ticketText,
          html: `<p>Your tickets are ready.</p><p><a href="${manageUrl}">Manage tickets and view QR codes</a></p><pre>${ticketText}</pre>`,
        }),
      })
      if (!emailResponse.ok) {
        deliveryStatus = 'failed'
        deliveryError = await emailResponse.text()
      }

      await recordDeliveryAttempt({
        sale: result.sale,
        channel: 'email',
        status: deliveryStatus,
        provider: 'resend',
        error: deliveryError,
        manageUrl,
        idempotencyKey: `delivery:${result.sale.id}:email:${deliveryStatus}`,
      })
    } else {
      await recordDeliveryAttempt({
        sale: result.sale,
        channel: 'email',
        status: 'queued',
        provider: null,
        manageUrl,
        idempotencyKey: `delivery:${result.sale.id}:email:queued`,
      })
    }

    return NextResponse.json({
      success: true,
      message: resendKey
        ? `Tickets sent to ${recipient}`
        : `Ticket delivery queued for ${recipient}`,
      wallet_url: '/tickets/my-tickets',
      manage_url: manageUrl,
    })
  } catch (error) {
    console.error('[Ticket Delivery API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
