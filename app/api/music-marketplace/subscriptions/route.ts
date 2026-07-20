import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { canTransitionSubscription } from "@/lib/music/marketplace/order-state-machine"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import { createSandboxIntermediaryAdapter } from "@/lib/music/marketplace/partner-adapters"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  offering_id: z.string().uuid(),
  amount_minor: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  disclosure_version_id: z.string().uuid(),
  idempotency_key: z.string().min(8).max(120),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_subscriptions_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Subscriptions are not available.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("music_marketplace_subscriptions")
    .select("id, public_id, offering_id, amount_minor, currency, status, escrow_status, disclosure_version_id, partner_subscription_id, created_at, updated_at")
    .eq("investor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "subscriptions_query_failed", message: "Unable to load subscriptions.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_subscriptions_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Subscriptions are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data: offering } = await supabase
      .from("music_marketplace_offerings")
      .select("id, status, accepts_subscriptions, partner_id, partner_offering_id")
      .eq("id", payload.offering_id)
      .maybeSingle()

    if (!offering)
      return jsonError({ status: 404, code: "offering_not_found", message: "Offering not found.", retryable: false })
    if (!offering.accepts_subscriptions || offering.status !== "accepting_subscriptions")
      return jsonError({
        status: 409,
        code: "subscriptions_closed",
        message: "Offering is not accepting subscriptions.",
        retryable: false,
      })

    const { data: existing } = await supabase
      .from("music_marketplace_subscriptions")
      .select("id, public_id, status, partner_subscription_id")
      .eq("offering_id", payload.offering_id)
      .eq("investor_user_id", user.id)
      .eq("idempotency_key", payload.idempotency_key)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const adapter = createSandboxIntermediaryAdapter()
    const partnerResult = await adapter.createSubscription({
      offeringPartnerId: offering.partner_offering_id || offering.id,
      investorPartnerAccountId: `sandbox-${user.id}`,
      amountMinor: String(payload.amount_minor),
      currency: payload.currency,
      idempotencyKey: payload.idempotency_key,
    })

    if (!canTransitionSubscription("draft_local", "submitted_to_partner"))
      return jsonError({ status: 500, code: "invalid_subscription_transition", message: "Invalid subscription transition.", retryable: false })

    const { data, error } = await supabase
      .from("music_marketplace_subscriptions")
      .insert({
        offering_id: payload.offering_id,
        investor_user_id: user.id,
        amount_minor: payload.amount_minor,
        currency: payload.currency,
        disclosure_version_id: payload.disclosure_version_id,
        idempotency_key: payload.idempotency_key,
        status: "submitted_to_partner",
        escrow_status: "pending",
        partner_subscription_id: partnerResult.partnerSubscriptionId,
      })
      .select("id, public_id, offering_id, amount_minor, currency, status, escrow_status, partner_subscription_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "subscription_create_failed", message: "Unable to create subscription.", retryable: true })

    await supabase.from("music_marketplace_subscription_events").insert({
      subscription_id: data.id,
      from_status: "draft_local",
      to_status: "submitted_to_partner",
      reason_code: "partner_adapter_sandbox",
      payload: { partnerResult },
    })

    return NextResponse.json({
      data,
      note: "Escrow and legal acceptance are partner-controlled. Tourify does not hold investor funds.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid subscription payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "subscription_create_failed", message: "Unable to create subscription.", retryable: true })
  }
}
