import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeOrNull } from '@/lib/stripe'

const stripe = getStripeOrNull()

async function loadPurchase(sessionId: string) {
  if (!stripe) return { error: 'Payment service not configured', status: 503 as const }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (!session) return { error: 'Session not found', status: 404 as const }

  const { sale_id } = session.metadata || {}
  if (!sale_id) return { error: 'Sale ID not found in session', status: 400 as const }

  const supabase = await createClient()
  const { data: sale, error: saleError } = await supabase
    .from('ticket_sales')
    .select(`
      *,
      ticket_types:ticket_type_id (name, price),
      events:event_id (title, date, location)
    `)
    .eq('id', sale_id)
    .single()

  if (saleError || !sale) return { error: 'Sale not found', status: 404 as const }
  if (session.payment_status !== 'paid') return { error: 'Payment not completed', status: 400 as const }

  return { sale, session }
}

function buildTicketText(sale: Record<string, any>) {
  return [
    'TOURIFY TICKET CONFIRMATION',
    '===========================',
    `Order: ${sale.order_number}`,
    `Customer: ${sale.customer_name || sale.buyer_name}`,
    `Email: ${sale.customer_email || sale.buyer_email}`,
    `Event: ${sale.events?.title || 'Event'}`,
    `Date: ${sale.events?.date || 'TBD'}`,
    `Location: ${sale.events?.location || 'TBD'}`,
    `Ticket Type: ${sale.ticket_types?.name || 'General Admission'}`,
    `Quantity: ${sale.quantity}`,
    `Total: $${Number(sale.total_amount || 0).toFixed(2)}`,
  ].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    const result = await loadPurchase(sessionId)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const ticketText = buildTicketText(result.sale)
    return new NextResponse(ticketText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="tickets-${result.sale.order_number}.txt"`,
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
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const recipient = result.sale.customer_email || result.sale.buyer_email
    if (!recipient) return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const ticketText = buildTicketText(result.sale)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.TICKET_EMAIL_FROM || 'tickets@tourify.live',
          to: recipient,
          subject: `Your tickets for ${result.sale.events?.title || 'your event'}`,
          text: ticketText,
        }),
      })
    }

    return NextResponse.json({
      success: true,
      message: resendKey
        ? `Tickets sent to ${recipient}`
        : `Ticket delivery queued for ${recipient}`,
    })
  } catch (error) {
    console.error('[Ticket Delivery API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
