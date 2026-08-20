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
import {
  reinstatePromoterCommission,
  reversePromoterCommission,
} from '@/lib/promoter-network/commission-finalization'

const stripe = getStripeOrNull()
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

async function recordProviderEvent(params: {
  supabase: ReturnType<typeof createServiceRoleClient>
  event: Stripe.Event
  signatureStatus: 'valid' | 'invalid'
  processingStatus?: 'pending' | 'processed' | 'quarantined' | 'failed' | 'ignored'
  quarantineReason?: string | null
  orderId?: string | null
  eventId?: string | null
  error?: string | null
}) {
  await params.supabase.from('ticket_provider_events').upsert({
    provider: 'stripe',
    external_event_id: params.event.id,
    event_type: params.event.type,
    order_id: params.orderId ?? null,
    event_id: params.eventId ?? null,
    raw_payload: {
      id: params.event.id,
      type: params.event.type,
      created: params.event.created,
      livemode: params.event.livemode,
    },
    signature_status: params.signatureStatus,
    idempotency_key: `stripe:${params.event.id}`,
    mapped_order_ids: params.orderId ? [params.orderId] : [],
    processing_status: params.processingStatus ?? 'pending',
    quarantine_reason: params.quarantineReason ?? null,
    error: params.error ?? null,
    processed_at: params.processingStatus === 'processed' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider,external_event_id' })
}

async function findSaleByPaymentIntent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  paymentIntent: string,
) {
  const byIntent = await supabase
    .from('ticket_sales')
    .select('id, buyer_user_id, total_amount')
    .eq('stripe_payment_intent_id', paymentIntent)
    .maybeSingle()
  if (byIntent.data?.id) return byIntent.data

  const byReference = await supabase
    .from('ticket_sales')
    .select('id, buyer_user_id, total_amount')
    .eq('payment_reference', paymentIntent)
    .maybeSingle()
  return byReference.data
}

function paymentIntentFromCharge(charge: Stripe.Charge) {
  return typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id || null
}

function paymentIntentFromDispute(dispute: Stripe.Dispute) {
  const paymentIntent = (dispute as Stripe.Dispute & {
    payment_intent?: string | { id?: string } | null
  }).payment_intent
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null
}

function isAlreadyAppliedTicketRefund(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /already been refunded|not refundable|no refundable admissions/i.test(message)
}

/**
 * The ticket webhook receipt is claimed before the ticket issue/refund work.
 * When Stripe retries after a downstream failure, recover only the idempotent
 * promoter financial command rather than replaying ticket inventory changes.
 */
async function recoverDuplicatePromoterProcessing(params: {
  supabase: ReturnType<typeof createServiceRoleClient>
  event: Stripe.Event
}) {
  const { supabase, event } = params
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status !== 'paid') return
    const saleId = session.metadata?.sale_id || session.metadata?.order_id
    if (!saleId) return
    await finalizePaidOrder({
      supabase,
      orderId: saleId,
      stripeEventId: event.id,
      paymentIntentId: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      checkoutSessionId: session.id,
    })
    return
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntent = paymentIntentFromCharge(charge)
    if (!paymentIntent) return
    const sale = await findSaleByPaymentIntent(supabase, paymentIntent)
    if (!sale?.id) return
    await reversePromoterCommission({
      orderId: sale.id,
      reversalType: 'refund_reversal',
      cumulativeRefundMinor: Number(charge.amount_refunded ?? charge.amount ?? 0),
      paymentReference: charge.id,
    })
    return
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    const paymentIntent = paymentIntentFromDispute(dispute)
    if (!paymentIntent) return
    const sale = await findSaleByPaymentIntent(supabase, paymentIntent)
    if (!sale?.id) return
    await reversePromoterCommission({
      orderId: sale.id,
      reversalType: 'chargeback_reversal',
      cumulativeRefundMinor: Number(dispute.amount ?? 0),
      paymentReference: dispute.id,
    })
    return
  }

  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    if (dispute.status !== 'won') return
    const paymentIntent = paymentIntentFromDispute(dispute)
    if (!paymentIntent) return
    const sale = await findSaleByPaymentIntent(supabase, paymentIntent)
    if (!sale?.id) return
    await reinstatePromoterCommission({ orderId: sale.id, disputeReference: dispute.id })
  }
}

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
    await recordProviderEvent({
      supabase,
      event,
      signatureStatus: 'valid',
      processingStatus: 'pending',
    })

    if (isTicketingV2Enabled()) {
      const claimed = await claimWebhookEvent({
        supabase,
        stripeEventId: event.id,
        eventType: event.type,
      })
      if (!claimed) {
        await recoverDuplicatePromoterProcessing({ supabase, event })
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: 'ignored',
          quarantineReason: 'duplicate',
        })
        return NextResponse.json({ received: true, duplicate: true })
      }
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status !== 'paid') break

        const saleId = session.metadata?.sale_id || session.metadata?.order_id
        if (!saleId) {
          await recordProviderEvent({
            supabase,
            event,
            signatureStatus: 'valid',
            processingStatus: 'quarantined',
            quarantineReason: 'missing_sale_id',
          })
          break
        }

        await finalizePaidOrder({
          supabase,
          orderId: saleId,
          stripeEventId: event.id,
          paymentIntentId: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          checkoutSessionId: session.id,
        })
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: 'processed',
          orderId: saleId,
          eventId: session.metadata?.event_id ?? null,
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
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: sale?.id ? 'processed' : 'quarantined',
          quarantineReason: sale?.id ? null : 'unmatched_payment_intent',
          orderId: sale?.id ?? null,
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id || null
        if (!paymentIntent) break

        const sale = await findSaleByPaymentIntent(supabase, paymentIntent)

        // Use Stripe refunded amount (cents → dollars), not always full order total
        const refundedCents = Number(charge.amount_refunded ?? charge.amount ?? 0)
        const refundAmount = Math.round((refundedCents / 100) * 100) / 100

        if (sale?.id && isTicketingV2Enabled()) {
          try {
            await refundOrderTickets({
              supabase,
              orderId: sale.id,
              actorUserId: sale.buyer_user_id || '00000000-0000-0000-0000-000000000000',
              refundAmount: refundAmount || Number(sale.total_amount || 0),
            })
          } catch (error) {
            // A verified refund may follow a local admin refund or an earlier
            // partial payment reversal. Continue to the idempotent commission
            // command without replaying ticket inventory.
            if (!isAlreadyAppliedTicketRefund(error)) throw error
            console.warn('[Ticketing Webhook] ticket refund already applied', error)
          }
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
        if (sale?.id) {
          await reversePromoterCommission({
            orderId: sale.id,
            reversalType: 'refund_reversal',
            cumulativeRefundMinor: refundedCents || Math.round(Number(sale.total_amount || 0) * 100),
            paymentReference: charge.id,
          })
        }
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: sale?.id ? 'processed' : 'quarantined',
          quarantineReason: sale?.id ? null : 'unmatched_refund',
          orderId: sale?.id ?? null,
        })
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const paymentIntent = paymentIntentFromDispute(dispute)
        const sale = paymentIntent ? await findSaleByPaymentIntent(supabase, paymentIntent) : null
        if (sale?.id) {
          await reversePromoterCommission({
            orderId: sale.id,
            reversalType: 'chargeback_reversal',
            cumulativeRefundMinor: Number(dispute.amount ?? 0),
            paymentReference: dispute.id,
          })
        }
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: sale?.id ? 'processed' : 'quarantined',
          quarantineReason: sale?.id ? null : 'unmatched_dispute',
          orderId: sale?.id ?? null,
        })
        break
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute
        const paymentIntent = paymentIntentFromDispute(dispute)
        const sale = paymentIntent ? await findSaleByPaymentIntent(supabase, paymentIntent) : null
        if (sale?.id && dispute.status === 'won') {
          await reinstatePromoterCommission({ orderId: sale.id, disputeReference: dispute.id })
        }
        await recordProviderEvent({
          supabase,
          event,
          signatureStatus: 'valid',
          processingStatus: sale?.id ? 'processed' : 'quarantined',
          quarantineReason: sale?.id ? null : 'unmatched_dispute',
          orderId: sale?.id ?? null,
        })
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
