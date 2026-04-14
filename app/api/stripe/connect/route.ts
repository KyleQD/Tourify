import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  isConnectV1Express,
  isConnectV2,
  resolveStripeConnectAccountId,
} from "@/lib/stripe-connect-resolve"
import { getStripeClient } from "@/lib/stripe"

function connectReturnUrls(request: NextRequest) {
  const fallback = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/artist/features/payments`
  const referer = request.headers.get("referer")
  let origin: string
  let pathname: string
  try {
    const base = referer || fallback
    const u = new URL(base)
    origin = u.origin
    pathname = u.pathname || "/artist/features/payments"
  } catch {
    const u = new URL(fallback)
    origin = u.origin
    pathname = u.pathname
  }
  return { origin, pathname }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { action } = await request.json()

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, full_name, metadata, stripe_connect_account_id, stripe_connect_v2_account_id, stripe_connect_account_kind",
      )
      .eq("id", user.id)
      .single()

    const stripeClient = getStripeClient()
    const existingConnectId = resolveStripeConnectAccountId(profile)

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

      if (existingConnectId) {
        return NextResponse.json({
          error: "A Stripe Connect account is already linked to this profile (legacy Express or V2).",
          accountId: existingConnectId,
          connectKind: profile?.stripe_connect_account_kind
            ?? (profile?.stripe_connect_account_id ? "v1_express" : null),
        }, { status: 400 })
      }

      // New sellers: V2 core accounts only (no top-level type — not Express/Standard/Custom).
      const displayName =
        profile?.full_name?.trim()
        || user.email?.split("@")[0]?.trim()
        || "Seller"

      const account = await stripeClient.v2.core.accounts.create({
        display_name: displayName,
        contact_email: user.email ?? undefined,
        identity: { country: "us" },
        dashboard: "full",
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        configuration: {
          customer: {},
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
      })

      const accountId = account.id

      await supabase
        .from("profiles")
        .update({
          stripe_connect_v2_account_id: accountId,
          stripe_connect_account_kind: "v2",
        })
        .eq("id", user.id)

      return NextResponse.json({ accountId, connectKind: "v2" as const })
    }

    if (action === "onboarding_link") {
      if (!existingConnectId)
        return NextResponse.json({ error: "No Stripe Connect account found. Create one first." }, { status: 400 })

      const { origin, pathname } = connectReturnUrls(request)

      if (isConnectV2(profile)) {
        const accountLink = await stripeClient.v2.core.accountLinks.create({
          account: existingConnectId,
          use_case: {
            type: "account_onboarding",
            account_onboarding: {
              configurations: ["merchant", "customer"],
              refresh_url: `${origin}${pathname}?stripe_connect=refresh`,
              return_url: `${origin}${pathname}?stripe_connect=complete&accountId=${encodeURIComponent(existingConnectId)}`,
            },
          },
        })
        return NextResponse.json({ url: accountLink.url })
      }

      if (isConnectV1Express(profile)) {
        const accountLink = await stripeClient.accountLinks.create({
          account: existingConnectId,
          refresh_url: `${origin}${pathname}?stripe_connect=refresh`,
          return_url: `${origin}${pathname}?stripe_connect=complete`,
          type: "account_onboarding",
        })
        return NextResponse.json({ url: accountLink.url })
      }

      return NextResponse.json({ error: "Unknown Connect account configuration" }, { status: 400 })
    }

    if (action === "dashboard_link") {
      if (!existingConnectId)
        return NextResponse.json({ error: "No Stripe Connect account found" }, { status: 400 })

      const loginLink = await stripeClient.accounts.createLoginLink(existingConnectId)
      return NextResponse.json({ url: loginLink.url })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Stripe Connect API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "stripe_connect_account_id, stripe_connect_v2_account_id, stripe_connect_account_kind",
      )
      .eq("id", user.id)
      .single()

    const connectId = resolveStripeConnectAccountId(profile)
    if (!connectId) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        connectKind: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
    }

    const stripeClient = getStripeClient()

    if (isConnectV2(profile)) {
      const account = await stripeClient.v2.core.accounts.retrieve(connectId, {
        include: ["configuration.merchant", "requirements"],
      })

      const a = account as unknown as {
        configuration?: {
          merchant?: { capabilities?: { card_payments?: { status?: string } } }
        }
        requirements?: { summary?: { minimum_deadline?: { status?: string } } }
      }

      const readyToProcessPayments =
        a.configuration?.merchant?.capabilities?.card_payments?.status === "active"
      const requirementsStatus = a.requirements?.summary?.minimum_deadline?.status
      const onboardingComplete =
        requirementsStatus !== "currently_due" && requirementsStatus !== "past_due"

      return NextResponse.json({
        connected: true,
        accountId: connectId,
        connectKind: "v2" as const,
        chargesEnabled: readyToProcessPayments,
        payoutsEnabled: readyToProcessPayments,
        detailsSubmitted: Boolean(onboardingComplete),
        requirementsStatus: requirementsStatus ?? null,
        businessName: displayNameFromV2(account),
      })
    }

    const account = await stripeClient.accounts.retrieve(connectId)

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      connectKind: "v1_express" as const,
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

function displayNameFromV2(account: unknown): string | null {
  const row = account as { display_name?: string | { default?: string } }
  if (!row.display_name) return null
  if (typeof row.display_name === "string") return row.display_name
  return row.display_name.default ?? null
}
