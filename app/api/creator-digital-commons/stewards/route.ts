import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateCommonsActivation } from "@/lib/music/creator-digital-commons/commons-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_steward_entity_enabled && !flags.creator_digital_commons_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Steward entity readiness is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_commons_stewards")
    .select("id, legal_name, jurisdiction, status, charter_version, policy_version, production_authority, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "stewards_query_failed", message: "Unable to load stewards.", retryable: true })

  const activation = evaluateCommonsActivation({
    separateStewardApproved: false,
    publicGovernanceApproved: false,
    localSovereigntyTested: false,
    criticalAssetCustodyVerified: false,
    independentImplementations: 0,
    independentOperators: 0,
    conformancePassed: false,
    tourifyExitDrillPassed: false,
    fundingRunwayMonths: 0,
    legalPrivacySecurityAccessibilityApproved: false,
    publicReviewComplete: false,
    scopeAndJurisdictionsDefined: false,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: data || [],
    activation,
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Tourify is an optional provider; Phase 11 records are inputs only.",
    enabled: true,
  })
}
