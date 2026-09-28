/**
 * Idempotent marketplace Stripe webhook processor.
 *
 * Critical security properties (P0 gap):
 * - Every event is logged to marketplace_payment_events BEFORE processing.
 * - Duplicate Stripe event IDs are detected and safely ignored (no double-fulfillment).
 * - Out-of-order events: paid→refund sequence is safe because we check current order state.
 * - All order transitions use the existing order_lifecycle helpers.
 * - Notifications are dispatched AFTER the DB commit, never before.
 *
 * Processing flow for checkout.session.completed:
 *   1. Insert event record (status=processing). If INSERT fails with unique violation → already processed → 200 OK.
 *   2. Load order by session metadata.order_id.
 *   3. Re-check order payment_status — skip if already 'paid'.
 *   4. Apply paid transition + decrement inventory + digital entitlements in sequence.
 *   5. Mark event processed.
 *   6. Dispatch notifications (best-effort, never blocking).
 */

import 'server-only'
import type Stripe from 'stripe'
import {
  getPaidLifecycleTransition,
  getFailedPaymentPatch,
  getRefundPatch,
  isFullStripeChargeRefund,
} from '@/lib/marketplace/order-lifecycle'
import { buildInventoryDecrementPatch } from '@/lib/marketplace/inventory'
import { ensurePrintfulFulfillmentRequests } from '@/lib/marketplace/printful-fulfillment'

export const WEBHOOK_PROCESSING_FAILED = 'Webhook processing failed'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookProcessingResult =
  | { outcome: 'processed' }
  | { outcome: 'duplicate'; eventId: string }
  | { outcome: 'skipped'; reason: string }
  | { outcome: 'error'; message: string }

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function handleMarketplaceStripeEventIdempotent({
  event,
  supabase,
}: {
  event: Stripe.Event
  supabase: any
}): Promise<WebhookProcessingResult> {

  // Step 1: Record event — unique constraint on provider_event_id prevents doubles
  const { error: insertError } = await supabase
    .from('marketplace_payment_events')
    .insert({
      provider_event_id: event.id,
      event_type: event.type,
      processing_status: 'processing',
      attempts: 1,
    })

  if (insertError) {
    // Unique violation (code 23505) → already seen this event
    if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
      return { outcome: 'duplicate', eventId: event.id }
    }
    // Other DB error — return so Stripe retries
    return { outcome: 'error', message: WEBHOOK_PROCESSING_FAILED }
  }

  try {
    let result: WebhookProcessingResult

    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break
      case 'payment_intent.payment_failed':
        result = await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase)
        break
      case 'charge.refunded':
        result = await handleChargeRefunded(event.data.object as Stripe.Charge, supabase)
        break
      default:
        result = { outcome: 'skipped', reason: `Unhandled event type: ${event.type}` }
    }

    // Mark event processed
    const { error: completionError } = await supabase
      .from('marketplace_payment_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider_event_id', event.id)
    if (completionError) throw new Error(`Event completion update failed: ${completionError.message}`)

    return result
  } catch (err: unknown) {
    // Mark event failed so ops can investigate
    await supabase
      .from('marketplace_payment_events')
      .update({
        processing_status: 'failed',
        // Persist only a non-sensitive failure class. Raw provider payloads
        // and database messages must never become an externally readable
        // webhook error or operational data field.
        last_error: 'internal_error',
        attempts: supabase.rpc ? undefined : undefined, // increment handled separately if needed
      })
      .eq('provider_event_id', event.id)

    return { outcome: 'error', message: WEBHOOK_PROCESSING_FAILED }
  }
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
): Promise<WebhookProcessingResult> {
  const orderId = session.metadata?.order_id
  if (!orderId || session.payment_status !== 'paid') {
    return { outcome: 'skipped', reason: 'No order_id in metadata or payment not paid.' }
  }

  const paymentReference = (session.payment_intent as string) || session.id

  // Load current order
  const { data: order } = await supabase
    .from('marketplace_orders')
    .select('id, status, payment_status, shipping_address, metadata, seller_user_id, buyer_user_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return { outcome: 'skipped', reason: `Order ${orderId} not found.` }
  }

  // Idempotency: already paid
  const transition = getPaidLifecycleTransition({
    currentOrderStatus: order.status,
    currentPaymentStatus: order.payment_status,
    paymentReference,
  })
  if (!transition.shouldApplyPaidTransition) {
    return { outcome: 'skipped', reason: 'Order already paid.' }
  }

  // Extract shipping from session if not already on the order
  const shippingFromStripe = extractShipping(session)
  const orderPatch = {
    ...transition.orderPatch,
    ...(shippingFromStripe && !order.shipping_address ? { shipping_address: shippingFromStripe } : {}),
  }

  // Apply order transition
  const { error: orderErr } = await supabase
    .from('marketplace_orders')
    .update(orderPatch)
    .eq('id', orderId)

  if (orderErr) throw new Error(`Order update failed: ${orderErr.message}`)

  // Update payout ledger
  if (transition.payoutPatch) {
    await supabase
      .from('marketplace_payout_ledger')
      .update(transition.payoutPatch)
      .eq('order_id', orderId)
  }

  // Decrement inventory
  await decrementInventory(supabase, orderId)

  // Digital entitlements (music, etc.)
  await ensureDigitalEntitlements(supabase, orderId, session)

  // Printful fulfillment
  await ensurePrintfulFulfillmentRequests({ supabase, orderId })

  // Dispatch notifications (best-effort)
  dispatchOrderPaidNotifications(supabase, orderId, order).catch(() => {/* swallow */})

  return { outcome: 'processed' }
}

// ---------------------------------------------------------------------------
// payment_intent.payment_failed
// ---------------------------------------------------------------------------

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<WebhookProcessingResult> {
  const patch = getFailedPaymentPatch({ paymentReference: paymentIntent.id })

  await supabase
    .from('marketplace_orders')
    .update(patch.orderPatch)
    .eq('payment_reference', paymentIntent.id)
    .in('payment_status', ['pending', 'processing'])  // only update if not already resolved

  await supabase
    .from('marketplace_payout_ledger')
    .update(patch.payoutPatch)
    .eq('payout_reference', paymentIntent.id)

  // Release inventory reservation (if any reserved items exist)
  await releaseInventoryReservations(supabase, paymentIntent.id)

  return { outcome: 'processed' }
}

// ---------------------------------------------------------------------------
// charge.refunded
// ---------------------------------------------------------------------------

async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: any
): Promise<WebhookProcessingResult> {
  const paymentReference = charge.payment_intent as string
  if (!paymentReference) {
    return { outcome: 'skipped', reason: 'Refunded charge has no payment intent.' }
  }

  if (!isFullStripeChargeRefund({
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    refunded: charge.refunded,
  })) {
    await supabase
      .from('marketplace_payout_ledger')
      .update({ payout_status: 'on_hold', payout_reference: paymentReference })
      .eq('payout_reference', paymentReference)
    return { outcome: 'skipped', reason: 'Partial refund placed payout on hold.' }
  }
  const patch = getRefundPatch({ paymentReference })

  await supabase
    .from('marketplace_orders')
    .update(patch.orderPatch)
    .eq('payment_reference', paymentReference)

  await supabase
    .from('marketplace_payout_ledger')
    .update(patch.payoutPatch)
    .eq('payout_reference', paymentReference)

  return { outcome: 'processed' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractShipping(session: Stripe.Checkout.Session) {
  const details = (
    (session as any).shipping_details ||
    session.collected_information?.shipping_details
  ) as any
  if (!details?.address) return null
  return {
    name: details.name ?? null,
    line1: details.address.line1 ?? null,
    line2: details.address.line2 ?? null,
    city: details.address.city ?? null,
    state: details.address.state ?? null,
    postal_code: details.address.postal_code ?? null,
    country: details.address.country ?? null,
  }
}

const MAX_INVENTORY_RETRIES = 5

/**
 * Optimistic-concurrency decrement: re-reads and conditionally writes so
 * concurrent paid webhooks can never double-decrement (lost update) or drive
 * stock negative. Returns false only when stock is genuinely insufficient.
 */
async function tryDecrementRow(
  supabase: any,
  table: 'marketplace_listings' | 'marketplace_listing_variants',
  rowId: string,
  qty: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_INVENTORY_RETRIES; attempt += 1) {
    const { data: row } = await supabase
      .from(table)
      .select('id, inventory_count, has_unlimited_inventory')
      .eq('id', rowId)
      .maybeSingle()

    if (!row || row.has_unlimited_inventory || row.inventory_count == null) return true

    const currentCount = Number(row.inventory_count)
    if (currentCount < qty) {
      console.error(
        `[Inventory] Insufficient stock on ${table}/${rowId}: have ${currentCount}, need ${qty}. ` +
        'Order proceeds (payment captured) — restock or refund required.'
      )
      return false
    }

    const patch = buildInventoryDecrementPatch({ currentCount, quantity: qty })
    if (!patch) return true

    // Conditional write: only succeeds if the count is unchanged since the read.
    const { data: updated, error } = await supabase
      .from(table)
      .update(patch)
      .eq('id', rowId)
      .eq('inventory_count', currentCount)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error(`[Inventory] Conditional decrement failed on ${table}/${rowId}:`, error)
      return false
    }
    if (updated) return true
    // Concurrent modification — loop and retry with a fresh read.
  }

  console.error(`[Inventory] Gave up decrementing ${table}/${rowId} after ${MAX_INVENTORY_RETRIES} retries`)
  return false
}

async function decrementInventory(supabase: any, orderId: string) {
  const { data: items } = await supabase
    .from('marketplace_order_items')
    .select('listing_id, variant_id, quantity')
    .eq('order_id', orderId)

  for (const item of items ?? []) {
    const qty = Number(item.quantity ?? 0)
    if (!item.listing_id || qty <= 0) continue

    if (item.variant_id) {
      await tryDecrementRow(supabase, 'marketplace_listing_variants', item.variant_id, qty)
    }
    // Listing-level inventory tracks total stock across variants.
    await tryDecrementRow(supabase, 'marketplace_listings', item.listing_id, qty)

    // Auto-transition to sold_out if inventory hits 0
    const { data: listingAfter } = await supabase
      .from('marketplace_listings')
      .select('id, inventory_count')
      .eq('id', item.listing_id)
      .maybeSingle()
    if (listingAfter && listingAfter.inventory_count === 0) {
      await supabase
        .from('marketplace_listings')
        .update({ status: 'sold_out' })
        .eq('id', listingAfter.id)
        .eq('status', 'published')
    }
  }
}

async function releaseInventoryReservations(supabase: any, paymentReference: string) {
  // On payment failure, revert checkout_attempts to 'failed' so inventory
  // is freed (inventory is not hard-decremented until webhook confirms paid)
  await supabase
    .from('marketplace_checkout_attempts')
    .update({ status: 'failed' })
    .eq('status', 'pending')
    // Match by finding the order linked to this payment reference
    .in('order_id', supabase
      .from('marketplace_orders')
      .select('id')
      .eq('payment_reference', paymentReference)
    )
}

async function ensureDigitalEntitlements(
  supabase: any,
  orderId: string,
  session: Stripe.Checkout.Session
) {
  const { data: items } = await supabase
    .from('marketplace_order_items')
    .select('id, product_type, listing_id, music_track_id, metadata')
    .eq('order_id', orderId)

  const digitalItems = (items ?? []).filter((i: any) => i.product_type === 'digital_asset')
  if (!digitalItems.length) return

  const buyerUserId: string | null = session.metadata?.buyer_user_id ?? null
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  for (const item of digitalItems) {
    // Idempotency: skip if entitlement already exists
    const { data: existing } = await supabase
      .from('marketplace_entitlements')
      .select('id')
      .eq('order_item_id', item.id)
      .maybeSingle()
    if (existing) continue

    const meta = (item.metadata && typeof item.metadata === 'object') ? item.metadata as Record<string, unknown> : {}

    await supabase.from('marketplace_entitlements').insert({
      order_item_id: item.id,
      buyer_user_id: buyerUserId,
      asset_url: typeof meta.assetUrl === 'string' ? meta.assetUrl : '',
      watermarked_asset_url: typeof meta.watermarkedAssetUrl === 'string' ? meta.watermarkedAssetUrl : null,
      signed_url: typeof meta.assetUrl === 'string' ? meta.assetUrl : null,
      signed_url_expires_at: expiresAt,
      max_downloads: 5,
      status: 'active',
    })

    await supabase
      .from('marketplace_order_items')
      .update({ fulfillment_status: 'completed' })
      .eq('id', item.id)
  }
}

async function dispatchOrderPaidNotifications(
  supabase: any,
  orderId: string,
  order: { seller_user_id: string; buyer_user_id: string | null }
) {
  const notifications = [
    // Notify seller of new order
    {
      user_id: order.seller_user_id,
      type: 'marketplace_order_paid',
      title: 'New order received',
      content: `You have a new marketplace order.`,
      priority: 'high',
      related_content_id: orderId,
      related_content_type: 'marketplace_order',
    },
    // Notify buyer if authenticated
    ...(order.buyer_user_id ? [{
      user_id: order.buyer_user_id,
      type: 'marketplace_order_confirmation',
      title: 'Order confirmed',
      content: `Your order has been confirmed.`,
      priority: 'normal',
      related_content_id: orderId,
      related_content_type: 'marketplace_order',
    }] : []),
  ]

  await supabase.from('notifications').insert(notifications)
}
