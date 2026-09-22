import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_RENEWAL_DISCLAIMER } from "@/lib/music/creator-treaty-system-renewal/renewal-disclaimer"
import { resolveCreatorTreatyRenewalFlags } from "@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags"
import { evaluatePhase18Activation } from "@/lib/music/creator-treaty-system-renewal/phase18-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyRenewalFlags(supabase, user.id)
  if (!flags.creator_treaty_renewal_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty renewal status is not available.", retryable: false })

  const [{ data: cycles }, { data: packages }] = await Promise.all([
    supabase
      .from("creator_treaty_renewal_cycles")
      .select("id, public_name, renewal_state, claims_perpetuity, claims_privilege, production_authority, jurisdiction, effective_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("future_phase18_approval_packages")
      .select("id, package_key, status, legal_character, title, repeated_phase17_cycles, legal_review_approved, archive_restore_passed, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  const activation = evaluatePhase18Activation({
    repeatedPhase17Cycles: 0,
    legalReviewApproved: false,
    renewalAuthorityVerified: false,
    archiveRestorePassed: false,
    independentOperators: 0,
    tourifyUnavailablePassed: false,
    unresolvedCriticalBlockers: 1,
    now: new Date(),
  })

  return NextResponse.json({
    data: {
      renewalCycles: cycles || [],
      approvalPackages: packages || [],
      legalClaims: {
        perpetualInstitution: false,
        liveTreatyRenewal: false,
        privilege: false,
        futurePersonRepresentation: false,
        irreversibleDissolution: false,
        universalIdentity: false,
        publicActivation: false,
        phase19Features: false,
      },
      activation,
    },
    disclaimer: CREATOR_TREATY_RENEWAL_DISCLAIMER,
    note: "No perpetual institution, live treaty renewal, or Phase 19 features exist. Silence never renews authority.",
    enabled: true,
  })
}
