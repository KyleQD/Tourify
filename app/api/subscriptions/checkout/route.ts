import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Stripe Price ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      )

    const { priceId, successUrl, cancelUrl } = parsed.data

    const stripe = getStripe()

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { tourify_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }

    const origin = request.headers.get("origin")
      || process.env.NEXT_PUBLIC_SITE_URL
      || "http://localhost:3003"

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${origin}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${origin}/settings?tab=billing`,
      metadata: { tourify_user_id: user.id },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error("[Subscription Checkout] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
