import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'

const stripe = getStripeOrNull()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId)
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    if (!stripe)
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (!session)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const saleId = session.metadata?.sale_id || session.metadata?.order_id
    if (!saleId)
      return NextResponse.json({ error: 'Sale ID not found in session' }, { status: 400 })

    // Service role so post-checkout page works before session cookies settle
    const supabase = createServiceRoleClient()

    const { data: sale, error: saleError } = await supabase
      .from('ticket_sales')
      .select(`
        *,
        ticket_types:ticket_type_id (
          id,
          name,
          price,
          description
        ),
        events_v2:event_id (
          id,
          title,
          start_at,
          venue_id
        )
      `)
      .eq('id', saleId)
      .single()

    if (saleError || !sale) {
      console.error('[Ticket Verification API] Error fetching sale:', saleError)
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    if (session.payment_status !== 'paid')
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })

    const event = sale.events_v2 as any
    const purchase = {
      order_number: sale.order_number || (sale.metadata as any)?.order_number,
      customer_name: sale.buyer_name || sale.customer_name,
      customer_email: sale.buyer_email || sale.customer_email,
      quantity: sale.quantity,
      total_amount: parseFloat(sale.total_amount),
      purchase_date: sale.created_at || sale.purchase_date,
      wallet_url: '/tickets/my-tickets',
      ticket_type: {
        name: sale.ticket_types?.name,
        price: parseFloat(sale.ticket_types?.price || '0'),
      },
      event: {
        title: event?.title,
        date: event?.start_at || event?.date,
        location: event?.location || '',
      },
    }

    return NextResponse.json({ purchase })
  } catch (error) {
    console.error('[Ticket Verification API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
