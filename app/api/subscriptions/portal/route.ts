import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id)
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 400 },
      )

    const stripe = getStripe()

    const origin = request.headers.get("origin")
      || process.env.NEXT_PUBLIC_SITE_URL
      || "http://localhost:3003"

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[Subscription Portal] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
