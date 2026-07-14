import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'

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
      events_v2:event_id (title, start_at)
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

function buildTicketText(sale: Record<string, any>, tickets: any[]) {
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
    'View QR codes in your Tourify wallet:',
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://tourify.live'}/tickets/my-tickets`,
  ]

  for (const ticket of tickets) {
    const token = (ticket.ticket_credentials || []).find((c: any) => c.status === 'active')?.token
    if (token) lines.push(`Credential: ${token}`)
  }

  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    const result = await loadPurchase(sessionId)
    if ('error' in result && result.error)
      return NextResponse.json({ error: result.error }, { status: result.status })

    const ticketText = buildTicketText(result.sale, result.tickets || [])
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
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const ticketText = buildTicketText(result.sale, result.tickets || [])
      const firstToken = (result.tickets || [])
        .flatMap((t: any) => t.ticket_credentials || [])
        .find((c: any) => c.status === 'active')?.token

      const qrHtml = firstToken
        ? `<p><img alt="Ticket QR" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(firstToken)}" /></p>
           <p>Open all tickets in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tourify.live'}/tickets/my-tickets">Tourify wallet</a>.</p>`
        : `<p>Open your tickets in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tourify.live'}/tickets/my-tickets">Tourify wallet</a>.</p>`

      await fetch('https://api.resend.com/emails', {
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
          html: `<pre>${ticketText}</pre>${qrHtml}`,
        }),
      })
    }

    return NextResponse.json({
      success: true,
      message: resendKey
        ? `Tickets sent to ${recipient}`
        : `Ticket delivery queued for ${recipient}`,
      wallet_url: '/tickets/my-tickets',
    })
  } catch (error) {
    console.error('[Ticket Delivery API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
