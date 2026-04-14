import { NextRequest, NextResponse } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is required for subscription webhooks")
  return secret
}

export async function POST(request: NextRequest) {
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

    const supabase = createServiceRoleClient()

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any
        await upsertSubscription(supabase, subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as any
        const paidSubId = invoice.subscription as string | null
        if (paidSubId) {
          await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", paidSubId)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        const failedSubId = invoice.subscription as string | null
        if (failedSubId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", failedSubId)
        }
        break
      }

      default:
        console.log(`[Subscription Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Subscription Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function upsertSubscription(supabase: any, subscription: any) {
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
    return
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
  }
}
