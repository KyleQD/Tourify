import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getStripeOrNull } from '@/lib/stripe'

const stripe = getStripeOrNull()

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    console.log('[Ticketing Webhook] Processing webhook')
    
    if (!stripe || !endpointSecret) {
      console.error('[Ticketing Webhook] Stripe not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Ticketing Webhook] No signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('[Ticketing Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.payment_status === 'paid') {
          console.log('[Ticketing Webhook] Payment completed for session:', session.id)
          
          const { sale_id, order_number } = session.metadata || {}
          
          if (sale_id) {
            // Update sale status to paid
            const { error: updateError } = await supabase
              .from('ticket_sales')
              .update({ 
                payment_status: 'paid',
                transaction_id: session.payment_intent as string,
                updated_at: new Date().toISOString()
              })
              .eq('id', sale_id)

            if (updateError) {
              console.error('[Ticketing Webhook] Error updating sale status:', updateError)
              return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
            }

            console.log('[Ticketing Webhook] Successfully updated sale:', sale_id)
          }
        }
        break

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[Ticketing Webhook] Payment intent succeeded:', paymentIntent.id)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log('[Ticketing Webhook] Payment failed:', failedPayment.id)
        
        // Update sale status to failed
        const { error: updateError } = await supabase
          .from('ticket_sales')
          .update({ 
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', failedPayment.id)

        if (updateError) {
          console.error('[Ticketing Webhook] Error updating failed sale:', updateError)
        }
        break

      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge
        console.log('[Ticketing Webhook] Charge refunded:', charge.id)
        
        // Update sale status to refunded
        const { error: refundError } = await supabase
          .from('ticket_sales')
          .update({ 
            payment_status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', charge.payment_intent as string)

        if (refundError) {
          console.error('[Ticketing Webhook] Error updating refunded sale:', refundError)
        }
        break

      default:
        console.log('[Ticketing Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[Ticketing Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
} 