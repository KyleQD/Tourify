import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { getFailedPaymentPatch, getPaidLifecycleTransition, getRefundPatch } from "@/lib/marketplace/order-lifecycle"

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" as any,
  })
}

const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_MARKETPLACE || process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET_MARKETPLACE or STRIPE_WEBHOOK_SECRET is required")
  return secret
}

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    if (!signature) return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 })

    const stripe = getStripe()
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
    } catch (error) {
      console.error("Marketplace webhook signature validation failed", error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = await createClient()
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      if (orderId && session.payment_status === "paid") {
        const paymentReference = (session.payment_intent as string) || session.id
        const { data: existingOrder } = await supabase
          .from("marketplace_orders")
          .select("id, payment_status")
          .eq("id", orderId)
          .maybeSingle()

        const transition = getPaidLifecycleTransition({
          currentPaymentStatus: existingOrder?.payment_status,
          paymentReference,
        })
        if (!transition.shouldApplyPaidTransition || !transition.orderPatch || !transition.payoutPatch)
          return NextResponse.json({ received: true })

        const { error: orderError } = await supabase
          .from("marketplace_orders")
          .update(transition.orderPatch)
          .eq("id", orderId)

        if (orderError) {
          console.error("Failed to update marketplace order after payment", orderError)
          return NextResponse.json({ error: "Order update failed" }, { status: 500 })
        }

        const { data: items } = await supabase
          .from("marketplace_order_items")
          .select("id, product_type, listing_id, music_track_id")
          .eq("order_id", orderId)

        const digitalItems = (items || []).filter(item => item.product_type === "digital_asset")
        if (digitalItems.length) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          for (const item of digitalItems) {
            const { data: existingEntitlement } = await supabase
              .from("marketplace_entitlements")
              .select("id")
              .eq("order_item_id", item.id)
              .maybeSingle()

            if (existingEntitlement) continue

            const { data: itemWithMetadata } = await supabase
              .from("marketplace_order_items")
              .select("metadata")
              .eq("id", item.id)
              .maybeSingle()

            const metadata =
              itemWithMetadata?.metadata && typeof itemWithMetadata.metadata === "object"
                ? (itemWithMetadata.metadata as Record<string, unknown>)
                : {}

            const assetUrl = typeof metadata.assetUrl === "string" ? metadata.assetUrl : ""
            const watermarkedAssetUrl = typeof metadata.watermarkedAssetUrl === "string" ? metadata.watermarkedAssetUrl : null
            const assetBucket = typeof metadata.assetBucket === "string" ? metadata.assetBucket : null
            const assetPath = typeof metadata.assetPath === "string" ? metadata.assetPath : null
            const previewBucket = typeof metadata.previewBucket === "string" ? metadata.previewBucket : null
            const previewPath = typeof metadata.previewPath === "string" ? metadata.previewPath : null

            const { data: createdEntitlement, error: entitlementInsertError } = await supabase
              .from("marketplace_entitlements")
              .insert({
                order_item_id: item.id,
                buyer_user_id: session.metadata?.buyer_user_id || null,
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
                status: "active",
              })
              .select("id")
              .single()

            if (entitlementInsertError) {
              console.error("Failed to create entitlement", entitlementInsertError)
              continue
            }

            if (session.metadata?.buyer_user_id && item.music_track_id) {
              await supabase.from("user_music_library").upsert(
                {
                  buyer_user_id: session.metadata.buyer_user_id,
                  order_item_id: item.id,
                  entitlement_id: createdEntitlement?.id || null,
                  listing_id: item.listing_id,
                  music_track_id: item.music_track_id,
                  seller_user_id: session.metadata?.seller_user_id || null,
                  source: "marketplace_purchase",
                },
                {
                  onConflict: "buyer_user_id,music_track_id",
                }
              )
            }
          }
        }

        await supabase
          .from("marketplace_payout_ledger")
          .update(transition.payoutPatch)
          .eq("order_id", orderId)

        if (session.metadata?.seller_user_id) {
          await supabase.from("achievement_progress_events").insert({
            user_id: session.metadata.seller_user_id,
            metric_key: "marketplace_sales_total",
            event_type: "marketplace_order_paid",
            event_value: 1,
            event_source: "api_marketplace_webhook",
            event_data: {
              order_id: orderId,
              amount_total: session.amount_total,
            },
          })
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const failed = event.data.object as Stripe.PaymentIntent
      const patch = getFailedPaymentPatch({ paymentReference: failed.id })
      await supabase
        .from("marketplace_orders")
        .update(patch.orderPatch)
        .eq("payment_reference", patch.orderPatch.payment_reference)
      await supabase
        .from("marketplace_payout_ledger")
        .update(patch.payoutPatch)
        .eq("payout_reference", patch.payoutPatch.payout_reference)
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      const paymentReference = charge.payment_intent as string
      const patch = getRefundPatch({ paymentReference })
      await supabase
        .from("marketplace_orders")
        .update(patch.orderPatch)
        .eq("payment_reference", patch.orderPatch.payment_reference)
      await supabase
        .from("marketplace_payout_ledger")
        .update(patch.payoutPatch)
        .eq("payout_reference", patch.payoutPatch.payout_reference)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Unexpected marketplace webhook error", error)
    return NextResponse.json({ error: "Unexpected webhook error" }, { status: 500 })
  }
}
