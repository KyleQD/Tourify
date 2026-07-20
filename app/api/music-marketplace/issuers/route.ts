import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateIssuerDeficiencies } from "@/lib/music/marketplace/issuer-eligibility"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  legal_name: z.string().min(1).max(200),
  entity_type: z.string().min(1).max(80).default("llc"),
  authority_attested: z.boolean().default(false),
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
      message: "Marketplace issuer workspace is not available.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("music_marketplace_issuers")
    .select("id, public_id, legal_name, entity_type, status, authority_attested, readiness_score, deficiency_codes, created_at, updated_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "issuers_query_failed", message: "Unable to load issuers.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
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
        message: "Marketplace issuer workspace is not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const evaluation = evaluateIssuerDeficiencies({
      authorityAttested: payload.authority_attested,
      hasBeneficialOwners: false,
      hasEligibleCatalogLink: false,
      hasPassportSnapshot: false,
      hasRoyaltySnapshot: false,
      hasValuationSnapshot: false,
      openDisputeHold: false,
      openLienHold: false,
      badActorFlag: false,
    })

    const { data, error } = await supabase
      .from("music_marketplace_issuers")
      .insert({
        owner_user_id: user.id,
        legal_name: payload.legal_name,
        entity_type: payload.entity_type,
        authority_attested: payload.authority_attested,
        status: evaluation.eligible ? "eligible" : "draft",
        readiness_score: evaluation.readinessScore,
        deficiency_codes: evaluation.deficiencyCodes,
      })
      .select("id, public_id, legal_name, entity_type, status, readiness_score, deficiency_codes")
      .single()

    if (error)
      return jsonError({ status: 500, code: "issuer_create_failed", message: "Unable to create issuer.", retryable: true })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid issuer payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "issuer_create_failed", message: "Unable to create issuer.", retryable: true })
  }
}
