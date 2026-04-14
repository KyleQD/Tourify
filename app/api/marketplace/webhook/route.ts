import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripe } from "@/lib/stripe"
import { handleMarketplaceStripeEvent } from "@/lib/marketplace/webhook-handler"

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

    const supabase = createServiceRoleClient()
    await handleMarketplaceStripeEvent({ event, supabase })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Unexpected marketplace webhook error", error)
    return NextResponse.json({ error: "Unexpected webhook error" }, { status: 500 })
  }
}
