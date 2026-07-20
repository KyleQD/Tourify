import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { evaluateInfrastructureActivation } from "@/lib/music/creator-public-infrastructure/infrastructure-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_entity_enabled && !flags.creator_public_infrastructure_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure entity readiness is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_public_infrastructure_entities")
    .select("id, legal_name, entity_kind, status, jurisdiction, governance_policy_version, production_authority, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "entities_query_failed", message: "Unable to load infrastructure entities.", retryable: true })

  const activation = evaluateInfrastructureActivation({
    separateEntityApproved: false,
    governanceApproved: false,
    fundingApproved: false,
    standardsProfilesApproved: false,
    twoIndependentImplementationsPassed: false,
    securityApproved: false,
    privacyApproved: false,
    accessibilityApproved: false,
    jurisdictionApproved: false,
    rollbackProven: false,
  })

  return NextResponse.json({
    data: data || [],
    activation,
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Tourify is an optional technology provider; Phase 10 federation records are inputs only.",
    enabled: true,
  })
}
