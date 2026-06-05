import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
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

    // Use service role to bypass RLS — this is a trusted Stripe webhook
    const supabase = createServiceRoleClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.payment_status === 'paid') {
          console.log('[Ticketing Webhook] Payment completed for session:', session.id)

          const { sale_id } = session.metadata || {}

          if (sale_id) {
            // Fetch the sale to get ticket_type_id and quantity
            const { data: sale, error: fetchError } = await supabase
              .from('ticket_sales')
              .select('ticket_type_id, quantity')
              .eq('id', sale_id)
              .maybeSingle()

            if (fetchError) {
              console.error('[Ticketing Webhook] Error fetching sale:', fetchError)
              return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 })
            }

            // Update sale payment_status to 'completed' (matches DB check constraint)
            const { error: updateError } = await supabase
              .from('ticket_sales')
              .update({
                payment_status: 'completed',
                payment_reference: session.payment_intent as string,
                updated_at: new Date().toISOString(),
              })
              .eq('id', sale_id)

            if (updateError) {
              console.error('[Ticketing Webhook] Error updating sale status:', updateError)
              return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
            }

            // Increment quantity_sold on the ticket_type
            if (sale?.ticket_type_id && sale?.quantity) {
              const { error: qtyError } = await supabase.rpc('increment_ticket_quantity_sold', {
                p_ticket_type_id: sale.ticket_type_id,
                p_quantity: sale.quantity,
              })

              if (qtyError) {
                // Fallback: raw UPDATE if RPC doesn't exist yet
                console.warn('[Ticketing Webhook] RPC fallback for quantity_sold:', qtyError.message)
                await supabase
                  .from('ticket_types')
                  .update({ updated_at: new Date().toISOString() })
                  .eq('id', sale.ticket_type_id)
                  .select('quantity_sold')
                  .then(async () => {
                    // Manual increment via re-select
                    const { data: tt } = await supabase
                      .from('ticket_types')
                      .select('quantity_sold')
                      .eq('id', sale.ticket_type_id)
                      .single()
                    if (tt) {
                      await supabase
                        .from('ticket_types')
                        .update({
                          quantity_sold: (tt.quantity_sold ?? 0) + sale.quantity,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', sale.ticket_type_id)
                    }
                  })
              }
            }

            console.log('[Ticketing Webhook] Successfully processed sale:', sale_id)
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[Ticketing Webhook] Payment intent succeeded:', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log('[Ticketing Webhook] Payment failed:', failedPayment.id)

        await supabase
          .from('ticket_sales')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', failedPayment.id)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[Ticketing Webhook] Charge refunded:', charge.id)

        // Fetch sale first to decrement quantity_sold
        const { data: sale } = await supabase
          .from('ticket_sales')
          .select('ticket_type_id, quantity')
          .eq('payment_reference', charge.payment_intent as string)
          .maybeSingle()

        await supabase
          .from('ticket_sales')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', charge.payment_intent as string)

        // Decrement quantity_sold on refund
        if (sale?.ticket_type_id && sale?.quantity) {
          const { data: tt } = await supabase
            .from('ticket_types')
            .select('quantity_sold')
            .eq('id', sale.ticket_type_id)
            .single()
          if (tt) {
            await supabase
              .from('ticket_types')
              .update({
                quantity_sold: Math.max(0, (tt.quantity_sold ?? 0) - sale.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq('id', sale.ticket_type_id)
          }
        }
        break
      }

      default:
        console.log('[Ticketing Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Ticketing Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
