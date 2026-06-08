import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeOrNull } from '@/lib/stripe'

const stripe = getStripeOrNull()

export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Get the sale details from metadata
    const { sale_id, order_number } = session.metadata || {}

    if (!sale_id) {
      return NextResponse.json({ error: 'Sale ID not found in session' }, { status: 400 })
    }

    // Fetch the sale details from database
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
        events:event_id (
          id,
          title,
          date,
          location
        )
      `)
      .eq('id', sale_id)
      .single()

    if (saleError || !sale) {
      console.error('[Ticket Verification API] Error fetching sale:', saleError)
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // Verify payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Format the response
    const purchase = {
      order_number: sale.order_number,
      customer_name: sale.customer_name,
      customer_email: sale.customer_email,
      quantity: sale.quantity,
      total_amount: parseFloat(sale.total_amount),
      purchase_date: sale.purchase_date,
      ticket_type: {
        name: sale.ticket_types?.name,
        price: parseFloat(sale.ticket_types?.price || '0')
      },
      event: {
        title: sale.events?.title,
        date: sale.events?.date,
        location: sale.events?.location
      }
    }

    return NextResponse.json({ purchase })

  } catch (error) {
    console.error('[Ticket Verification API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 