import type Stripe from 'stripe'
import { getFailedPaymentPatch, getPaidLifecycleTransition, getRefundPatch } from '@/lib/marketplace/order-lifecycle'
import { ensurePrintfulFulfillmentRequests } from '@/lib/marketplace/printful-fulfillment'
import { buildInventoryDecrementPatch } from '@/lib/marketplace/inventory'
import { recordMusicEvent } from '@/lib/music/music-access'

export async function handleMarketplaceStripeEvent({
  event,
  supabase,
}: {
  event: Stripe.Event
  supabase: any
}) {
  console.info('Marketplace webhook received', {
    eventId: event.id,
    eventType: event.type,
  })

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutSessionCompleted({
      session: event.data.object as Stripe.Checkout.Session,
      supabase,
    })
    return
  }

  if (event.type === 'payment_intent.payment_failed') {
    await handlePaymentIntentFailed({
      paymentIntent: event.data.object as Stripe.PaymentIntent,
      supabase,
    })
    return
  }

  if (event.type === 'charge.refunded') {
    await handleChargeRefunded({
      charge: event.data.object as Stripe.Charge,
      supabase,
    })
  }
}

async function handleCheckoutSessionCompleted({
  session,
  supabase,
}: {
  session: Stripe.Checkout.Session
  supabase: any
}) {
  const orderId = session.metadata?.order_id
  if (!orderId || session.payment_status !== 'paid') return

  const paymentReference = (session.payment_intent as string) || session.id
  const { data: existingOrder } = await supabase
    .from('marketplace_orders')
    .select('id, payment_status, shipping_address, metadata')
    .eq('id', orderId)
    .maybeSingle()

  const transition = getPaidLifecycleTransition({
    currentPaymentStatus: existingOrder?.payment_status,
    paymentReference,
  })
  if (!transition.shouldApplyPaidTransition || !transition.orderPatch || !transition.payoutPatch) return

  const shippingFromStripe = extractShippingAddressFromSession(session)
  const orderPatch = {
    ...transition.orderPatch,
    ...(shippingFromStripe && !existingOrder?.shipping_address
      ? { shipping_address: shippingFromStripe }
      : {}),
  }

  const { error: orderError } = await supabase
    .from('marketplace_orders')
    .update(orderPatch)
    .eq('id', orderId)

  if (orderError) {
    console.error('Marketplace order update failed', {
      orderId,
      paymentReference,
      error: orderError.message,
    })
    throw new Error('Order update failed')
  }

  await decrementInventoryForOrder({ supabase, orderId })

  await ensureDigitalEntitlements({
    supabase,
    orderId,
    buyerUserId: session.metadata?.buyer_user_id || null,
    sellerUserId: session.metadata?.seller_user_id || null,
    amountTotal: session.amount_total || null,
  })
  await ensurePrintfulFulfillmentRequests({ supabase, orderId })

  const { error: payoutError } = await supabase
    .from('marketplace_payout_ledger')
    .update(transition.payoutPatch)
    .eq('order_id', orderId)
  if (payoutError) {
    console.error('Marketplace payout ledger update failed', {
      orderId,
      paymentReference,
      error: payoutError.message,
    })
    throw new Error('Payout ledger update failed')
  }
}

function extractShippingAddressFromSession(session: Stripe.Checkout.Session) {
  type CheckoutShippingDetails = NonNullable<
    NonNullable<Stripe.Checkout.Session['collected_information']>['shipping_details']
  > & {
    phone?: string | null
  }
  const sessionWithLegacyShipping = session as Stripe.Checkout.Session & {
    shipping_details?: CheckoutShippingDetails | null
  }
  const details = (
    sessionWithLegacyShipping.shipping_details ||
    session.collected_information?.shipping_details
  ) as CheckoutShippingDetails | null | undefined
  if (!details?.address) return null
  return {
    name: details.name || null,
    phone: details.phone || null,
    line1: details.address.line1 || null,
    line2: details.address.line2 || null,
    city: details.address.city || null,
    state: details.address.state || null,
    postal_code: details.address.postal_code || null,
    country: details.address.country || null,
  }
}

async function decrementInventoryForOrder({
  supabase,
  orderId,
}: {
  supabase: any
  orderId: string
}) {
  const { data: items } = await supabase
    .from('marketplace_order_items')
    .select('listing_id, variant_id, quantity')
    .eq('order_id', orderId)

  for (const item of items || []) {
    const quantity = Number(item.quantity || 0)
    if (!item.listing_id || quantity <= 0) continue

    if (item.variant_id) {
      const { data: variant } = await supabase
        .from('marketplace_listing_variants')
        .select('id, inventory_count')
        .eq('id', item.variant_id)
        .maybeSingle()
      if (variant && variant.inventory_count != null) {
        const patch = buildInventoryDecrementPatch({
          currentCount: variant.inventory_count,
          quantity,
        })
        if (patch) {
          await supabase
            .from('marketplace_listing_variants')
            .update({ inventory_count: patch.inventory_count })
            .eq('id', variant.id)
        }
      }
    }

    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select('id, inventory_count, has_unlimited_inventory')
      .eq('id', item.listing_id)
      .maybeSingle()

    if (!listing || listing.has_unlimited_inventory || listing.inventory_count == null) continue

    const patch = buildInventoryDecrementPatch({
      currentCount: listing.inventory_count,
      quantity,
    })
    if (!patch) continue

    await supabase
      .from('marketplace_listings')
      .update(patch)
      .eq('id', listing.id)
  }
}

async function ensureDigitalEntitlements({
  supabase,
  orderId,
  buyerUserId,
  sellerUserId,
  amountTotal,
}: {
  supabase: any
  orderId: string
  buyerUserId: string | null
  sellerUserId: string | null
  amountTotal: number | null
}) {
  const { data: items } = await supabase
    .from('marketplace_order_items')
    .select('id, product_type, listing_id, music_track_id')
    .eq('order_id', orderId)

  const digitalItems = (items || []).filter((item: any) => item.product_type === 'digital_asset')
  if (!digitalItems.length) return

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  let deliveredEntitlementsCount = 0

  for (const item of digitalItems) {
    const { data: existingEntitlement } = await supabase
      .from('marketplace_entitlements')
      .select('id')
      .eq('order_item_id', item.id)
      .maybeSingle()

    if (existingEntitlement) continue

    const { data: itemWithMetadata } = await supabase
      .from('marketplace_order_items')
      .select('metadata')
      .eq('id', item.id)
      .maybeSingle()

    const metadata =
      itemWithMetadata?.metadata && typeof itemWithMetadata.metadata === 'object'
        ? (itemWithMetadata.metadata as Record<string, unknown>)
        : {}

    const assetUrl = typeof metadata.assetUrl === 'string' ? metadata.assetUrl : ''
    const watermarkedAssetUrl = typeof metadata.watermarkedAssetUrl === 'string' ? metadata.watermarkedAssetUrl : null
    const assetBucket = typeof metadata.assetBucket === 'string' ? metadata.assetBucket : null
    const assetPath = typeof metadata.assetPath === 'string' ? metadata.assetPath : null
    const previewBucket = typeof metadata.previewBucket === 'string' ? metadata.previewBucket : null
    const previewPath = typeof metadata.previewPath === 'string' ? metadata.previewPath : null

    const { data: createdEntitlement, error: entitlementInsertError } = await supabase
      .from('marketplace_entitlements')
      .insert({
        order_item_id: item.id,
        buyer_user_id: buyerUserId,
        listing_id: item.listing_id,
        music_track_id: item.music_track_id,
        asset_url: assetUrl,
        watermarked_asset_url: watermarkedAssetUrl,
        asset_bucket: assetBucket,
        asset_path: assetPath,
        preview_bucket: previewBucket,
        preview_path: previewPath,
        signed_url: assetUrl || null,
        signed_url_expires_at: expiresAt,
        max_downloads: 5,
        status: 'active',
      })
      .select('id')
      .single()

    if (entitlementInsertError) {
      console.error('Marketplace entitlement insert failed', {
        orderId,
        orderItemId: item.id,
        buyerUserId,
        error: entitlementInsertError.message,
      })
      throw new Error('Entitlement insert failed')
    }

    deliveredEntitlementsCount += 1

    if (buyerUserId && item.music_track_id) {
      const { error: libraryUpsertError } = await supabase.from('user_music_library').upsert(
        {
          buyer_user_id: buyerUserId,
          order_item_id: item.id,
          entitlement_id: createdEntitlement?.id || null,
          listing_id: item.listing_id,
          music_track_id: item.music_track_id,
          seller_user_id: sellerUserId,
          source: 'marketplace_purchase',
        },
        {
          onConflict: 'buyer_user_id,music_track_id',
        }
      )
      if (libraryUpsertError) {
        console.error('Marketplace library upsert failed', {
          orderId,
          orderItemId: item.id,
          musicTrackId: item.music_track_id,
          buyerUserId,
          error: libraryUpsertError.message,
        })
        throw new Error('User music library upsert failed')
      }

      await recordMusicEvent({
        supabase,
        musicId: item.music_track_id,
        artistUserId: sellerUserId,
        actorUserId: buyerUserId,
        eventType: 'purchase',
        accessLevel: 'full',
        source: 'marketplace_webhook',
        metadata: {
          order_id: orderId,
          order_item_id: item.id,
          listing_id: item.listing_id,
          amount_total: amountTotal,
        },
      })
    }
  }

  const { error: fulfillmentError } = await supabase
    .from('marketplace_order_items')
    .update({ fulfillment_status: 'completed' })
    .in(
      'id',
      digitalItems.map((item: any) => item.id)
    )
  if (fulfillmentError) {
    console.error('Marketplace order item fulfillment update failed', {
      orderId,
      error: fulfillmentError.message,
    })
    throw new Error('Order item fulfillment update failed')
  }

  if (sellerUserId) {
    const { error: achievementInsertError } = await supabase.from('achievement_progress_events').insert({
      user_id: sellerUserId,
      metric_key: 'marketplace_sales_total',
      event_type: 'marketplace_order_paid',
      event_value: 1,
      event_source: 'api_marketplace_webhook',
      event_data: {
        order_id: orderId,
        amount_total: amountTotal,
      },
    })
    if (achievementInsertError) {
      console.error('Marketplace achievement event insert failed', {
        orderId,
        sellerUserId,
        error: achievementInsertError.message,
      })
    }
  }

  console.info('Marketplace entitlements delivered', {
    orderId,
    digitalItemCount: digitalItems.length,
    deliveredEntitlementsCount,
  })
}

async function handlePaymentIntentFailed({
  paymentIntent,
  supabase,
}: {
  paymentIntent: Stripe.PaymentIntent
  supabase: any
}) {
  const patch = getFailedPaymentPatch({ paymentReference: paymentIntent.id })
  await supabase
    .from('marketplace_orders')
    .update(patch.orderPatch)
    .eq('payment_reference', patch.orderPatch.payment_reference)
  await supabase
    .from('marketplace_payout_ledger')
    .update(patch.payoutPatch)
    .eq('payout_reference', patch.payoutPatch.payout_reference)
}

async function handleChargeRefunded({
  charge,
  supabase,
}: {
  charge: Stripe.Charge
  supabase: any
}) {
  const paymentReference = charge.payment_intent as string
  const patch = getRefundPatch({ paymentReference })
  await supabase
    .from('marketplace_orders')
    .update(patch.orderPatch)
    .eq('payment_reference', patch.orderPatch.payment_reference)
  await supabase
    .from('marketplace_payout_ledger')
    .update(patch.payoutPatch)
    .eq('payout_reference', patch.payoutPatch.payout_reference)
}
