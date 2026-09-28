import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'
import {
  claimWebhookEvent,
  completeWebhookEvent,
  finalizePaidOrder,
  markOrderFailedAndRelease,
  readWebhookEventCompletion,
  refundOrderTickets,
} from '@/lib/ticketing/finalize'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'

const stripe = getStripeOrNull()

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET_TICKETING
}

/**
 * POST /api/ticketing/webhook — claim-before-process with an observable
 * completion marker (TICKET-005 / HF-INTG-006-TICKETING).
 *
 * Idempotency (P0): every verified event is claimed in
 * `ticket_stripe_webhook_events` (unique on the Stripe event id) BEFORE any
 * processing, so a replay can never double-fulfil. The claim no longer implies
 * completion: `processed_at` is the claim stamp and `completed_at` is written
 * only after every handler write below has succeeded.
 *
 * A duplicate claim is therefore resolved by reading the completion marker, not
 * by the uniqueness violation alone:
 *   completed                 -> acknowledge the replay with zero side effects,
 *   claimed but not completed -> RESUME the interrupted work.
 *
 * Resuming is safe because the fulfilment transitions are guarded, not because
 * the route assumes it: `finalize_ticket_inventory` / `release_ticket_inventory`
 * are status-guarded, `issueTicketsForOrder` returns the tickets an earlier
 * attempt already issued, `writeSaleLedger` / `writeRefundLedger` are absorbed by
 * the `financial_transactions` partial unique idempotency index,
 * `refundOrderTickets` reports a replayed refund as a duplicate, and the
 * unguarded promo counter now runs only on the delivery that performed the
 * order's pending -> completed transition.
 */
export async function POST(request: NextRequest) {
  try {
    const endpointSecret = getWebhookSecret()
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
      // Use the secret already validated above rather than re-reading the
      // environment: a missing secret is then impossible here by construction
      // (it previously re-read process.env and could pass `undefined`).
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch {
      console.error('[Ticketing Webhook] Signature verification failed', { kind: 'invalid_signature' })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Claim before processing. A claim failure throws (an unavailable ledger is
    // not a duplicate), so it surfaces as the 500 below and Stripe retries.
    const claim = await claimWebhookEvent({
      supabase,
      stripeEventId: event.id,
      eventType: event.type,
    })

    let priorAttempts: number | null = null

    if (claim.kind === 'duplicate') {
      // A uniqueness violation only proves a PRIOR delivery claimed the event. It
      // says nothing about whether that delivery finished, so the completion
      // marker decides. An unreadable marker throws and becomes a 500: reporting
      // success for work that may not have happened is the defect being fixed.
      const prior = await readWebhookEventCompletion({ supabase, stripeEventId: event.id })
      if (prior.completed)
        return NextResponse.json({ received: true, duplicate: true, outcome: 'duplicate' })

      // Claimed but never completed: an earlier attempt died mid-processing.
      // Resume it — the guarded transitions make the re-apply a no-op wherever
      // the work already landed, and the completion marker is rewritten only
      // after this attempt finishes.
      priorAttempts = prior.attempts
      console.warn('[Ticketing Webhook] resuming incomplete claim', {
        kind: 'interrupted_claim_resume',
        eventType: event.type,
        attempts: prior.attempts,
      })
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

    // The handler ran to completion — including the deliberate no-op branches
    // (unpaid session, unknown event type, unmatched order), which are finished
    // handling rather than interrupted handling and must not resume forever.
    //
    // The completion write is checked. If it is not persisted the claim stays
    // incomplete on purpose, so the next Stripe delivery resumes instead of
    // acknowledging work this delivery never actually completed.
    const completionError = await completeWebhookEvent({
      supabase,
      stripeEventId: event.id,
      priorAttempts,
    })
    if (completionError) {
      console.error('[Ticketing Webhook] completion marker not persisted', {
        kind: 'internal_error',
        eventType: event.type,
      })
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }

    return NextResponse.json({
      received: true,
      outcome: claim.kind === 'duplicate' ? 'resumed' : 'processed',
    })
  } catch {
    console.error('[Ticketing Webhook] Error processing webhook', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
