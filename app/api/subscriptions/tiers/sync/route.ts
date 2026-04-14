import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"

const syncTierSchema = z.object({
  tierId: z.string().uuid("Invalid tier ID"),
})

/**
 * POST /api/subscriptions/tiers/sync
 * Sync an artist subscription tier to Stripe (create/update Product + Price).
 * Returns the Stripe price_id so fans can subscribe.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = syncTierSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { data: tier, error: tierError } = await supabase
      .from("artist_subscription_tiers")
      .select("*")
      .eq("id", parsed.data.tierId)
      .eq("user_id", user.id)
      .single()

    if (tierError || !tier)
      return NextResponse.json({ error: "Tier not found" }, { status: 404 })

    const stripe = getStripeClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()

    const artistName = profile?.full_name ?? "Artist"
    const priceInCents = Math.round(Number(tier.price) * 100)
    const interval = tier.interval === "yearly" ? "year" : "month"

    let productId = tier.stripe_product_id

    if (productId) {
      await stripe.products.update(productId, {
        name: `${tier.name} — ${artistName}`,
        description: tier.description || undefined,
        active: tier.status === "active",
      })
    } else {
      const product = await stripe.products.create({
        name: `${tier.name} — ${artistName}`,
        description: tier.description || undefined,
        metadata: {
          tourify_tier_id: tier.id,
          tourify_artist_user_id: user.id,
        },
      })
      productId = product.id
    }

    let priceId = tier.stripe_price_id

    if (priceId) {
      const existingPrice = await stripe.prices.retrieve(priceId)
      const priceChanged =
        existingPrice.unit_amount !== priceInCents ||
        existingPrice.recurring?.interval !== interval

      if (priceChanged) {
        await stripe.prices.update(priceId, { active: false })
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: priceInCents,
          currency: "usd",
          recurring: { interval },
          metadata: { tourify_tier_id: tier.id },
        })
        priceId = newPrice.id
      }
    } else {
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: priceInCents,
        currency: "usd",
        recurring: { interval },
        metadata: { tourify_tier_id: tier.id },
      })
      priceId = newPrice.id
    }

    await supabase
      .from("artist_subscription_tiers")
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      })
      .eq("id", tier.id)

    return NextResponse.json({
      productId,
      priceId,
      synced: true,
    })
  } catch (error) {
    console.error("[Tier Sync] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
