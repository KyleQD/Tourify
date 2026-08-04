import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { evaluatePhase19Activation } from "@/lib/music/creator-treaty-system-legacy/phase19-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (!flags.creator_treaty_legacy_readiness_enabled && !flags.creator_treaty_legacy_century_scale_strategy_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Legacy readiness packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase19_approval_packages")
    .select("id, package_key, status, title, legal_character, jurisdiction, dual_control, phase18_proofs_complete, century_scale_strategy_approved, successor_custody_verified, cultural_governance_approved, privacy_archival_analysis_complete, open_specs_published, independent_archives_count, sustainable_funding_verified, disaster_recovery_passed, provider_independence_verified, public_legitimacy_approved, sunset_at, expires_at, policy_version, schema_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load readiness packages.", retryable: true })

  return NextResponse.json({
    data: data || [],
    activation: evaluatePhase19Activation({
      phase18ProofsComplete: false,
      centuryScaleStrategyApproved: false,
      successorCustodyVerified: false,
      culturalGovernanceApproved: false,
      privacyArchivalAnalysisComplete: false,
      openSpecsPublished: false,
      independentArchivesCount: 0,
      sustainableFundingVerified: false,
      disasterRecoveryPassed: false,
      providerIndependenceVerified: false,
      publicLegitimacyApproved: false,
      independentOperators: 0,
      tourifyUnavailablePassed: false,
      unresolvedCriticalBlockers: 1,
      claimsPerpetuity: false,
      blocksLocalExit: false,
      now: new Date(),
    }),
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "activation_execution_blocked",
    message: "Legacy activation remains blocked until Phase 18 proofs, century-scale package criteria, dual operators, and a non-expired signed package complete.",
    retryable: false,
  })
}
