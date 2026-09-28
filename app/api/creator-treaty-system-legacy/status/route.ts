import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { evaluatePhase19Activation } from "@/lib/music/creator-treaty-system-legacy/phase19-activation-gate"
import { DENIED_LEGACY_LEGAL_CLAIMS } from "@/lib/music/creator-treaty-system-legacy/legacy-domain"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (!flags.creator_treaty_legacy_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty legacy status is not available.", retryable: false })

  const [{ data: cycles }, { data: packages }] = await Promise.all([
    supabase
      .from("creator_treaty_legacy_cycles")
      .select("id, public_name, legacy_state, claims_perpetuity, claims_future_person_representation, claims_universal_identity, blocks_local_exit, production_authority, jurisdiction, effective_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("future_phase19_approval_packages")
      .select("id, package_key, status, legal_character, title, phase18_proofs_complete, century_scale_strategy_approved, successor_custody_verified, independent_archives_count, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  const activation = evaluatePhase19Activation({
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
  })

  return NextResponse.json({
    data: {
      legacyCycles: cycles || [],
      approvalPackages: packages || [],
      legalClaims: DENIED_LEGACY_LEGAL_CLAIMS,
      activation,
    },
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
    note: "No perpetual authority, future-person representation, or Phase 20 features exist. Cannot launch from Phase 18 flags.",
    enabled: true,
  })
}
