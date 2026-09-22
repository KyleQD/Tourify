import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'

const getWebhookSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET_PHOTOS) {
    throw new Error('STRIPE_WEBHOOK_SECRET_PHOTOS is not set')
  }
  return process.env.STRIPE_WEBHOOK_SECRET_PHOTOS
}

export const dynamic = 'force-dynamic'

type LedgerClaim =
  | { kind: 'claimed' }
  | { kind: 'duplicate' }
  | { kind: 'degraded' }
  | { kind: 'error'; message: string }

interface LedgerRow {
  processing_status: string | null
  processed_at: string | null
  attempts: number | null
}

/**
 * POST /api/photos/purchase/webhook
 * Handle Stripe webhook events for photo purchases.
 *
 * Idempotency (P0): every verified event is claimed in `platform_webhook_events`
 * (unique on provider+provider_event_id) BEFORE processing. A unique violation
 * means the event was already claimed; it is acknowledged only when the prior
 * claim completed, otherwise the interrupted attempt is resumed. Purchase state
 * transitions are additionally guarded so no path can double-fulfill.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      const stripe = getStripe()
      const webhookSecret = getWebhookSecret()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const claim = await claimEvent(supabase, event)
    if (claim.kind === 'error') {
      // Surface so Stripe retries; nothing was processed.
      return NextResponse.json(
        { error: claim.message },
        { status: 500 }
      )
    }

    let priorAttempts: number | null = null

    if (claim.kind === 'duplicate') {
      const existing = await getClaimedEvent(supabase, event.id)
      if (
        existing &&
        (existing.processing_status === 'processed' || existing.processed_at)
      ) {
        // Already handled — acknowledge without reprocessing (no double-fulfill).
        return NextResponse.json({ received: true, outcome: 'duplicate' })
      }
      // Prior attempt claimed the event but never completed it (interrupted or
      // failed processing). Resume it; row-level guards keep fulfillment single.
      priorAttempts = existing ? Number(existing.attempts ?? 1) : 1
    }

    const handled = await processEvent(supabase, event)
    if (!handled.ok) {
      // Surface so Stripe retries; the claim stays incomplete and is resumed.
      return NextResponse.json({ error: handled.message }, { status: 500 })
    }

    if (claim.kind !== 'degraded') {
      await markLedgerProcessed(supabase, event.id, priorAttempts)
    }

    const outcome =
      claim.kind === 'duplicate' ? 'resumed' : claim.kind === 'degraded' ? 'degraded' : 'processed'
    return NextResponse.json({ received: true, outcome })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function claimEvent(supabase: any, event: Stripe.Event): Promise<LedgerClaim> {
  const { error } = await supabase
    .from('platform_webhook_events')
    .insert({
      provider: 'stripe',
      provider_event_id: event.id,
      event_type: event.type,
      processing_status: 'processing',
      attempts: 1,
    })

  if (!error) return { kind: 'claimed' }

  // Unique violation: the event was already claimed.
  if (error.code === '23505' || /duplicate key/i.test(error.message ?? '')) {
    return { kind: 'duplicate' }
  }

  // Ledger table not provisioned: degrade rather than fail the webhook.
  if (error.code === '42P01') {
    console.error('[Photos Webhook] platform_webhook_events missing; processing without ledger:', error)
    return { kind: 'degraded' }
  }

  console.error('[Photos Webhook] Ledger claim failed:', error)
  return { kind: 'error', message: 'Ledger claim failed' }
}

async function getClaimedEvent(supabase: any, eventId: string): Promise<LedgerRow | null> {
  const { data } = await supabase
    .from('platform_webhook_events')
    .select('processing_status, processed_at, attempts')
    .eq('provider', 'stripe')
    .eq('provider_event_id', eventId)
    .maybeSingle()
  return data ?? null
}

async function markLedgerProcessed(
  supabase: any,
  eventId: string,
  priorAttempts: number | null
) {
  await supabase
    .from('platform_webhook_events')
    .update({
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      attempts: (priorAttempts ?? 0) + 1,
    })
    .eq('provider', 'stripe')
    .eq('provider_event_id', eventId)
}

async function processEvent(
  supabase: any,
  event: Stripe.Event
): Promise<{ ok: boolean; message: string }> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.payment_status === 'paid') {
        const { purchase_id } = session.metadata || {}

        if (purchase_id) {
          // Generate secure download URL (valid for 24 hours)
          const downloadExpiresAt = new Date()
          downloadExpiresAt.setHours(downloadExpiresAt.getHours() + 24)

          // Only transition an unfinalized purchase: never re-complete an
          // already-completed purchase (double-fulfill) or a refunded/failed one.
          const { error: updateError } = await supabase
            .from('photo_purchases')
            .update({
              payment_status: 'completed',
              transaction_id: session.payment_intent as string,
              download_expires_at: downloadExpiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', purchase_id)
            .in('payment_status', ['pending', 'processing'])

          if (updateError) {
            console.error('Error updating purchase:', updateError)
            return { ok: false, message: 'Failed to update purchase' }
          }
        }
      }
      return { ok: true, message: '' }
    }

    case 'payment_intent.payment_failed': {
      const failedPayment = event.data.object as Stripe.PaymentIntent

      // Never regress an already-completed or refunded purchase.
      const { error: updateError } = await supabase
        .from('photo_purchases')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', failedPayment.id)
        .in('payment_status', ['pending', 'processing'])

      if (updateError) {
        console.error('Error updating failed purchase:', updateError)
        return { ok: false, message: 'Failed to update purchase status' }
      }
      return { ok: true, message: '' }
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge

      const { error: updateError } = await supabase
        .from('photo_purchases')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', charge.payment_intent as string)
        .neq('payment_status', 'refunded')

      if (updateError) {
        console.error('Error updating refunded purchase:', updateError)
        return { ok: false, message: 'Failed to update refunded purchase' }
      }
      return { ok: true, message: '' }
    }

    default:
      return { ok: true, message: '' }
  }
}