import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getStripeOrNull } from '@/lib/stripe'

const stripe = getStripeOrNull()

// Validation schemas
const purchaseTicketSchema = z.object({
  ticket_type_id: z.string().uuid('Invalid ticket type ID'),
  event_id: z.string().uuid('Invalid event ID'),
  customer_email: z.string().email('Invalid customer email'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  payment_method: z.enum(['stripe', 'paypal']).default('stripe'),
  metadata: z.record(z.any()).optional()
})

const checkAvailabilitySchema = z.object({
  ticket_type_id: z.string().uuid('Invalid ticket type ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1')
})

export async function GET(request: NextRequest) {
  try {
    console.log('[Public Ticketing API] GET request started')
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const event_id = searchParams.get('event_id')
    const ticket_type_id = searchParams.get('ticket_type_id')

    const supabase = await createClient()

    if (action === 'availability') {
      // Check ticket availability
      if (!ticket_type_id) {
        return NextResponse.json({ error: 'Ticket type ID is required' }, { status: 400 })
      }

      const { data: ticketType, error } = await supabase
        .from('ticket_types')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location
          )
        `)
        .eq('id', ticket_type_id)
        .eq('is_active', true)
        .single()

      if (error || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found or inactive' }, { status: 404 })
      }

      const available = ticketType.quantity_available - ticketType.quantity_sold
      const isAvailable = available > 0

      return NextResponse.json({
        available,
        is_available: isAvailable,
        ticket_type: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          description: ticketType.description,
          max_per_customer: ticketType.max_per_customer,
          sale_start: ticketType.sale_start,
          sale_end: ticketType.sale_end
        },
        event: ticketType.events
      })

    } else if (action === 'event_tickets') {
      // Get all ticket types for an event
      if (!event_id) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
      }

      const { data: ticketTypes, error } = await supabase
        .from('ticket_types')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location
          )
        `)
        .eq('event_id', event_id)
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) {
        console.error('[Public Ticketing API] Error fetching ticket types:', error)
        return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 })
      }

      const ticketTypesWithAvailability = ticketTypes?.map(ticket => ({
        ...ticket,
        available: ticket.quantity_available - ticket.quantity_sold,
        is_available: (ticket.quantity_available - ticket.quantity_sold) > 0
      })) || []

      return NextResponse.json({ ticket_types: ticketTypesWithAvailability })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Public Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Public Ticketing API] POST request started')
    
    const body = await request.json()
    const { action, ...data } = body

    const supabase = await createClient()

    if (action === 'purchase') {
      const validatedData = purchaseTicketSchema.parse(data)

      // Check ticket availability
      const { data: ticketType, error: ticketError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('id', validatedData.ticket_type_id)
        .eq('is_active', true)
        .single()

      if (ticketError || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found or inactive' }, { status: 404 })
      }

      const remainingTickets = ticketType.quantity_available - ticketType.quantity_sold
      if (validatedData.quantity > remainingTickets) {
        return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 })
      }

      // Check max per customer limit
      if (ticketType.max_per_customer) {
        const { data: existingSales } = await supabase
          .from('ticket_sales')
          .select('quantity')
          .eq('ticket_type_id', validatedData.ticket_type_id)
          .eq('customer_email', validatedData.customer_email)
          .neq('payment_status', 'refunded')

        const existingQuantity = existingSales?.reduce((sum: number, sale: any) => sum + sale.quantity, 0) || 0
        if (existingQuantity + validatedData.quantity > ticketType.max_per_customer) {
          return NextResponse.json({ error: 'Exceeds maximum tickets per customer' }, { status: 400 })
        }
      }

      // Calculate total amount
      const total_amount = ticketType.price * validatedData.quantity
      const fees = total_amount * 0.03 // 3% processing fee
      const order_number = `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`

      // Create pending sale record
      const { data: sale, error: saleError } = await supabase
        .from('ticket_sales')
        .insert({
          ...validatedData,
          total_amount,
          fees,
          order_number,
          payment_status: 'pending'
        })
        .select('*')
        .single()

      if (saleError) {
        console.error('[Public Ticketing API] Error creating sale:', saleError)
        return NextResponse.json({ error: 'Failed to create ticket sale' }, { status: 500 })
      }

      // Create Stripe checkout session
      if (!stripe) {
        return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${ticketType.name} - Event Ticket`,
                description: `Quantity: ${validatedData.quantity}`,
              },
              unit_amount: Math.round(ticketType.price * 100), // Convert to cents
            },
            quantity: validatedData.quantity,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/cancel?order_number=${order_number}`,
        metadata: {
          sale_id: sale.id,
          order_number,
          ticket_type_id: validatedData.ticket_type_id,
          event_id: validatedData.event_id,
          customer_email: validatedData.customer_email
        },
      })

      return NextResponse.json({ 
        session_url: session.url,
        order_number,
        sale_id: sale.id
      })

    } else if (action === 'check_availability') {
      const validatedData = checkAvailabilitySchema.parse(data)

      const { data: ticketType, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('id', validatedData.ticket_type_id)
        .eq('is_active', true)
        .single()

      if (error || !ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
      }

      const available = ticketType.quantity_available - ticketType.quantity_sold
      const canPurchase = available >= validatedData.quantity

      return NextResponse.json({
        available,
        requested: validatedData.quantity,
        can_purchase: canPurchase,
        ticket_type: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price
        }
      })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('[Public Ticketing API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 