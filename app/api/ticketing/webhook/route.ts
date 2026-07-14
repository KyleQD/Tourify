import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'
import {
  claimWebhookEvent,
  finalizePaidOrder,
  markOrderFailedAndRelease,
  refundOrderTickets,
} from '@/lib/ticketing/finalize'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'

const stripe = getStripeOrNull()
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !endpointSecret) {
      console.error('[Ticketing Webhook] Stripe not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature)
      return NextResponse.json({ error: 'No signature' }, { status: 400 })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('[Ticketing Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    if (isTicketingV2Enabled()) {
      const claimed = await claimWebhookEvent({
        supabase,
        stripeEventId: event.id,
        eventType: event.type,
      })
      if (!claimed)
        return NextResponse.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status !== 'paid') break

        const saleId = session.metadata?.sale_id || session.metadata?.order_id
        if (!saleId) break

        await finalizePaidOrder({
          supabase,
          orderId: saleId,
          stripeEventId: event.id,
          paymentIntentId: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          checkoutSessionId: session.id,
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent
        const { data: sale } = await supabase
          .from('ticket_sales')
          .select('id')
          .or(`payment_reference.eq.${failedPayment.id},stripe_payment_intent_id.eq.${failedPayment.id}`)
          .maybeSingle()

        if (sale?.id)
          await markOrderFailedAndRelease({ supabase, orderId: sale.id })
        else {
          await supabase
            .from('ticket_sales')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('payment_reference', failedPayment.id)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id || null
        if (!paymentIntent) break

        // Prefer stripe_payment_intent_id; fall back to payment_reference
        let sale: { id: string; buyer_user_id: string | null; total_amount: number } | null = null
        const byIntent = await supabase
          .from('ticket_sales')
          .select('id, buyer_user_id, total_amount')
          .eq('stripe_payment_intent_id', paymentIntent)
          .maybeSingle()
        if (byIntent.data?.id) {
          sale = byIntent.data
        } else {
          const byRef = await supabase
            .from('ticket_sales')
            .select('id, buyer_user_id, total_amount')
            .eq('payment_reference', paymentIntent)
            .maybeSingle()
          sale = byRef.data
        }

        // Use Stripe refunded amount (cents → dollars), not always full order total
        const refundedCents = Number(charge.amount_refunded ?? charge.amount ?? 0)
        const refundAmount = Math.round((refundedCents / 100) * 100) / 100

        if (sale?.id && isTicketingV2Enabled()) {
          await refundOrderTickets({
            supabase,
            orderId: sale.id,
            actorUserId: sale.buyer_user_id || '00000000-0000-0000-0000-000000000000',
            refundAmount: refundAmount || Number(sale.total_amount || 0),
          })
        } else if (sale?.id) {
          const { data: full } = await supabase
            .from('ticket_sales')
            .select('ticket_type_id, quantity')
            .eq('id', sale.id)
            .maybeSingle()

          await supabase
            .from('ticket_sales')
            .update({
              payment_status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sale.id)

          if (full?.ticket_type_id && full?.quantity) {
            const { data: tt } = await supabase
              .from('ticket_types')
              .select('quantity_sold')
              .eq('id', full.ticket_type_id)
              .single()
            if (tt) {
              await supabase
                .from('ticket_types')
                .update({
                  quantity_sold: Math.max(0, (tt.quantity_sold ?? 0) - full.quantity),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', full.ticket_type_id)
            }
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Ticketing Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
