import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { evaluateFederationActivation } from "@/lib/music/creator-federation/federation-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_entity_registry_enabled && !flags.creator_federation_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation entity registry is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_entities")
    .select("id, public_id, legal_name, jurisdiction, status, production_authority, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "entities_query_failed", message: "Unable to load federation entities.", retryable: true })

  const activation = evaluateFederationActivation({
    entityApproved: false,
    governingDocumentsApproved: false,
    memberOrganizationsApproved: 0,
    trustFrameworkApproved: false,
    securityReviewApproved: false,
    privacyReviewApproved: false,
    competitionReviewApproved: false,
    jurisdictionApproved: false,
    operationalOwnersAssigned: false,
    rollbackTested: false,
  })

  return NextResponse.json({
    data: data || [],
    activation,
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Phase 9 cooperative membership is not federation membership.",
    enabled: true,
  })
}
