import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_CONVENTION_DISCLAIMER } from "@/lib/music/creator-interoperability-convention/interop-convention-disclaimer"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"
import { evaluateInteropConventionActivation } from "@/lib/music/creator-interoperability-convention/interop-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
  if (!flags.creator_interop_network_registry_enabled && !flags.creator_interop_convention_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Interop network registry is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_interop_networks")
    .select("id, display_name, status, jurisdiction, policy_version, production_authority, claims_treaty_status, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "networks_query_failed", message: "Unable to load networks.", retryable: true })

  const activation = evaluateInteropConventionActivation({
    independentConstitutionalCompacts: 0,
    operationalEvidenceYears: 0,
    phase13ProductionProven: false,
    approvalPackageExecuted: false,
    localSovereigntyPreserved: true,
    voluntaryParticipationOnly: true,
    securityApproved: false,
    privacyApproved: false,
    accessibilityApproved: false,
    jurisdictionApproved: false,
    unresolvedCriticalBlockers: 1,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: data || [],
    activation,
    disclaimer: CREATOR_INTEROP_CONVENTION_DISCLAIMER,
    note: "Phase 13 is inputs only. Phase 14 cannot launch from Phase 13 flags.",
    enabled: true,
  })
}
