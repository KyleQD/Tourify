import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { canManageVenue } from "@/lib/venue/venue-access"
import { getStripeOrNull } from "@/lib/stripe"

export const dynamic = "force-dynamic"

/**
 * VEN-173 — payout destination status/onboarding for the Venue's acting
 * operator. Stripe Connect accounts are human-level (profiles row); the venue
 * surface only reflects status and creates hosted links — raw account ids and
 * secrets never reach the browser beyond a masked tail.
 */

function maskAccountId(accountId: string | null | undefined): string | null {
  if (!accountId) return null
  return `acct_••••${accountId.slice(-4)}`
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_finances")
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [{ data: profile }] = await Promise.all([
    auth.supabase.from("profiles").select("stripe_connect_account_id, stripe_connect_account_kind, stripe_connect_v2_account_id").eq("id", auth.user.id).maybeSingle(),
  ])

  let accountId: string | null = profile?.stripe_connect_account_id || null
  try {
    const mod = await import("@/lib/stripe-connect-resolve")
    accountId = mod.resolveStripeConnectAccountId(profile as any) || accountId
  } catch {
    // resolver optional; raw id fallback stands
  }

  let chargesEnabled: boolean | null = null
  let payoutsEnabled: boolean | null = null
  if (accountId) {
    const stripe = getStripeOrNull()
    if (stripe) {
      try {
        const account = await stripe.accounts.retrieve(accountId)
        chargesEnabled = Boolean(account.charges_enabled)
        payoutsEnabled = Boolean(account.payouts_enabled)
      } catch {
        chargesEnabled = null
        payoutsEnabled = null
      }
    }
  }

  const state = !accountId
    ? "not_connected"
    : chargesEnabled === false
      ? "pending_verification"
      : payoutsEnabled === false
        ? "payouts_pending"
        : "ready"

  return NextResponse.json({
    state,
    account_masked: maskAccountId(accountId),
    charges_enabled: chargesEnabled,
    payouts_enabled: payoutsEnabled,
    note:
      state === "not_connected"
        ? "Connect a payout account to receive settlement transfers."
        : state === "ready"
          ? "Payout destination is verified."
          : "Stripe still needs information before payouts can land.",
  })
}

const actionSchema = z.object({
  venue_id: z.string().uuid(),
  action: z.enum(["onboarding_link", "dashboard_link"]),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = actionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, parsed.data.venue_id, "pay_finances")
  if (!access.allowed) {
    // Only payout authority may create/maintain the money destination.
    return NextResponse.json({ error: "Pay finances permission required" }, { status: 403 })
  }

  const stripe = getStripeOrNull()
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured in this environment" }, { status: 503 })

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", auth.user.id)
    .maybeSingle()

  try {
    let accountId = profile?.stripe_connect_account_id || null

    if (parsed.data.action === "onboarding_link") {
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          metadata: { created_via: "venue_finance", user_id: auth.user.id },
        })
        accountId = account.id
        await auth.supabase
          .from("profiles")
          .update({ stripe_connect_account_id: accountId })
          .eq("id", auth.user.id)
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/venue/finances?tab=settings&payout=refresh`,
        return_url: `${origin}/venue/finances?tab=settings&payout=done`,
        type: "account_onboarding",
      })
      return NextResponse.json({ url: link.url, account_masked: maskAccountId(accountId) })
    }

    if (!accountId) return NextResponse.json({ error: "No connected payout account" }, { status: 404 })
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return NextResponse.json({ url: loginLink.url, account_masked: maskAccountId(accountId) })
  } catch (error: any) {
    console.error("[venue-payout] stripe error:", error?.message)
    return NextResponse.json({ error: error?.message || "Stripe request failed" }, { status: 502 })
  }
}
