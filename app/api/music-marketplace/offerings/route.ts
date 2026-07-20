import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { canLaunchOfferingFromPathway } from "@/lib/music/marketplace/offering-pathway"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import { LIQUIDITY_DISCLAIMER } from "@/lib/music/marketplace/marketplace-domain"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  issuer_id: z.string().uuid(),
  pathway_decision_id: z.string().uuid().optional().nullable(),
  finance_offering_id: z.string().uuid().optional().nullable(),
  target_raise_minor: z.number().int().positive().optional(),
  currency: z.string().length(3).default("USD"),
  instrument_terms: z.record(z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_offerings_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Marketplace offerings are not available.",
      retryable: false,
    })

  const { data: issuers } = await supabase
    .from("music_marketplace_issuers")
    .select("id")
    .eq("owner_user_id", user.id)
  const issuerIds = (issuers || []).map((row: { id: string }) => row.id)
  if (issuerIds.length === 0) return NextResponse.json({ data: [], enabled: true, disclaimer: LIQUIDITY_DISCLAIMER })

  const { data, error } = await supabase
    .from("music_marketplace_offerings")
    .select("id, public_id, issuer_id, pathway, status, partner_id, target_raise_minor, currency, liquidity_label, accepts_subscriptions, created_at, updated_at")
    .in("issuer_id", issuerIds)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "offerings_query_failed", message: "Unable to load offerings.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true, disclaimer: LIQUIDITY_DISCLAIMER })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_offerings_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Marketplace offerings are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data: issuer } = await supabase
      .from("music_marketplace_issuers")
      .select("id, owner_user_id")
      .eq("id", payload.issuer_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!issuer)
      return jsonError({ status: 404, code: "issuer_not_found", message: "Issuer not found.", retryable: false })

    let pathway: string | null = null
    let partnerId: string | null = null
    if (payload.pathway_decision_id) {
      const { data: decision } = await supabase
        .from("music_marketplace_pathway_decisions")
        .select("id, pathway, status, counsel_approved, partner_approved, approved_partner_id")
        .eq("id", payload.pathway_decision_id)
        .eq("issuer_id", payload.issuer_id)
        .maybeSingle()
      if (!decision)
        return jsonError({ status: 404, code: "pathway_not_found", message: "Pathway decision not found.", retryable: false })
      const gate = canLaunchOfferingFromPathway({
        counselApproved: decision.counsel_approved,
        partnerApproved: decision.partner_approved,
        approvedPartnerId: decision.approved_partner_id,
        status: decision.status,
      })
      // Draft offerings may be created before launch; launch remains gated.
      pathway = decision.pathway
      partnerId = decision.approved_partner_id
      if (decision.status === "approved" && !gate.allowed)
        return jsonError({
          status: 409,
          code: "pathway_incomplete",
          message: gate.rejectionReason || "Pathway incomplete.",
          retryable: false,
        })
    }

    const { data, error } = await supabase
      .from("music_marketplace_offerings")
      .insert({
        issuer_id: payload.issuer_id,
        pathway_decision_id: payload.pathway_decision_id || null,
        finance_offering_id: payload.finance_offering_id || null,
        pathway,
        partner_id: partnerId,
        status: "draft",
        target_raise_minor: payload.target_raise_minor ?? null,
        currency: payload.currency,
        instrument_terms: payload.instrument_terms,
        accepts_subscriptions: false,
        liquidity_label: "no_liquidity_guarantee",
      })
      .select("id, public_id, issuer_id, pathway, status, partner_id, liquidity_label, accepts_subscriptions")
      .single()

    if (error)
      return jsonError({ status: 500, code: "offering_create_failed", message: "Unable to create offering.", retryable: true })

    return NextResponse.json({ data, disclaimer: LIQUIDITY_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid offering payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "offering_create_failed", message: "Unable to create offering.", retryable: true })
  }
}
