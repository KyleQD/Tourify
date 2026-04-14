import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { action } = await request.json()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, metadata, stripe_connect_account_id")
      .eq("id", user.id)
      .single()

    const stripe = getStripe()

    if (action === "create_account") {
      const { data: storefront } = await supabase
        .from("marketplace_storefronts")
        .select("accepted_seller_agreement_at")
        .eq("seller_user_id", user.id)
        .maybeSingle()

      if (!storefront?.accepted_seller_agreement_at) {
        return NextResponse.json({
          error: "You must accept the Marketplace Seller Agreement before connecting a Stripe account. Visit /marketplace/seller-agreement to review and accept.",
          code: "seller_agreement_required",
        }, { status: 403 })
      }
      if (profile?.stripe_connect_account_id) {
        return NextResponse.json({
          error: "Stripe Connect account already exists",
          accountId: profile.stripe_connect_account_id,
        }, { status: 400 })
      }

      const account = await stripe.accounts.create({
        type: "express",
        email: user.email || undefined,
        metadata: { tourify_user_id: user.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: profile?.full_name || undefined,
          product_description: "Music and digital content on Tourify",
        },
      })

      await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: account.id })
        .eq("id", user.id)

      return NextResponse.json({ accountId: account.id })
    }

    if (action === "onboarding_link") {
      const accountId = profile?.stripe_connect_account_id
      if (!accountId)
        return NextResponse.json({ error: "No Stripe Connect account found. Create one first." }, { status: 400 })

      const returnBase = request.headers.get("referer") || `${process.env.NEXT_PUBLIC_SITE_URL}/artist/features/payments`
      const returnOrigin = new URL(returnBase).origin
      const returnPath = new URL(returnBase).pathname

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${returnOrigin}${returnPath}?stripe_connect=refresh`,
        return_url: `${returnOrigin}${returnPath}?stripe_connect=complete`,
        type: "account_onboarding",
      })

      return NextResponse.json({ url: accountLink.url })
    }

    if (action === "dashboard_link") {
      const accountId = profile?.stripe_connect_account_id
      if (!accountId)
        return NextResponse.json({ error: "No Stripe Connect account found" }, { status: 400 })

      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return NextResponse.json({ url: loginLink.url })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Stripe Connect API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single()

    const accountId = profile?.stripe_connect_account_id
    if (!accountId)
      return NextResponse.json({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(accountId)

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      businessName: account.business_profile?.name || null,
    })
  } catch (error) {
    console.error("Stripe Connect status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
