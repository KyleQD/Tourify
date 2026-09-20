import { NextRequest, NextResponse } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS is required for subscription webhooks")
  return secret
}

export async function POST(request: NextRequest) {
  let supabase: any = null
  let claimedEventId: string | null = null
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    if (!signature)
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })

    const stripe = getStripe()
    let event: any

    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
    } catch (err) {
      console.error("[Subscription Webhook] Signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    supabase = createServiceRoleClient()

    // Idempotency ledger: insert-before-process; a unique violation means the
    // event was already handled. Degrades gracefully (no dedupe) if the table
    // has not been provisioned yet.
    let seen = false
    {
      const { error: ledgerError } = await supabase
        .from("platform_webhook_events")
        .insert({
          provider: "stripe",
          provider_event_id: event.id,
          event_type: event.type,
          processing_status: "processing",
        })
      if (ledgerError) {
        if (ledgerError.code === "23505" || /duplicate key/i.test(ledgerError.message ?? "")) {
          return NextResponse.json({ received: true, outcome: "duplicate" })
        }
        console.error("[Subscription Webhook] Ledger insert failed:", ledgerError)
        throw new Error("Subscription webhook event persistence failed")
      }
      seen = true
      claimedEventId = event.id
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any
        const upserted = await upsertSubscription(supabase, subscription)
        if (!upserted.ok) throw new Error("Failed to persist subscription")
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)
        if (error) {
          console.error("[Subscription Webhook] Failed to mark canceled:", error)
          throw new Error("Failed to update subscription")
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as any
        const paidSubId = invoice.subscription as string | null
        if (paidSubId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", paidSubId)
          if (error) {
            console.error("[Subscription Webhook] Failed to mark active:", error)
            throw new Error("Failed to update subscription")
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        const failedSubId = invoice.subscription as string | null
        if (failedSubId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", failedSubId)
          if (error) {
            console.error("[Subscription Webhook] Failed to mark past_due:", error)
            throw new Error("Failed to update subscription")
          }
        }
        break
      }

      default:
    }

    if (seen) {
      const { error: completionError } = await supabase
        .from("platform_webhook_events")
        .update({ processing_status: "processed", processed_at: new Date().toISOString() })
        .eq("provider", "stripe")
        .eq("provider_event_id", event.id)
      if (completionError) throw new Error("Subscription webhook completion persistence failed")
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (supabase && claimedEventId) {
      const { error: failureError } = await supabase
        .from("platform_webhook_events")
        .update({ processing_status: "failed" })
        .eq("provider", "stripe")
        .eq("provider_event_id", claimedEventId)
      if (failureError) console.error("[Subscription Webhook] Failed to record failure:", failureError)
    }
    console.error("[Subscription Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function upsertSubscription(supabase: any, subscription: any): Promise<{ ok: boolean }> {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (!profile) {
    console.error("[Subscription Webhook] No profile found for Stripe customer:", customerId)
    // Not retryable: unknown customer will not appear by retrying.
    return { ok: true }
  }

  const priceId = subscription.items?.data?.[0]?.price?.id ?? ""

  const row = {
    user_id: profile.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    status: subscription.status,
    current_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" })

  if (error) {
    console.error("[Subscription Webhook] Failed to upsert subscription:", error)
    return { ok: false }
  }
  return { ok: true }
}
