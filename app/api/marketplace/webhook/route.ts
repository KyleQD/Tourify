import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripe } from "@/lib/stripe"
import { handleMarketplaceStripeEventIdempotent } from "@/lib/marketplace/webhook-processor"

const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_MARKETPLACE || process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET_MARKETPLACE or STRIPE_WEBHOOK_SECRET is required")
  return secret
}

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: "Could not read request body" }, { status: 400 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (err) {
    console.error("Marketplace webhook signature validation failed", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const result = await handleMarketplaceStripeEventIdempotent({ event, supabase })

  if (result.outcome === "error") {
    console.error("Marketplace webhook processing error", { eventId: event.id, message: result.message })
    // Return 500 so Stripe retries
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  // Duplicates and skips are safe — return 200 so Stripe doesn't retry
  return NextResponse.json({ received: true, outcome: result.outcome })
}
