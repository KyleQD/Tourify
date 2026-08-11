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
  if (!flags.creator_treaty_renewal_readiness_enabled && !flags.creator_treaty_renewal_repeated_cycles_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Renewal readiness packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase18_approval_packages")
    .select("id, package_key, status, title, legal_character, jurisdiction, dual_control, repeated_phase17_cycles, legal_review_approved, archive_restore_passed, public_notice_complete, independent_review_complete, sunset_at, expires_at, policy_version, schema_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load readiness packages.", retryable: true })

  return NextResponse.json({
    data: data || [],
    activation: evaluatePhase18Activation({
      repeatedPhase17Cycles: 0,
      legalReviewApproved: false,
      renewalAuthorityVerified: false,
      archiveRestorePassed: false,
      independentOperators: 0,
      tourifyUnavailablePassed: false,
      unresolvedCriticalBlockers: 1,
      now: new Date(),
    }),
    disclaimer: CREATOR_TREATY_RENEWAL_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "activation_execution_blocked",
    message: "Renewal activation remains blocked until ≥2 Phase 17 cycles, legal review, archive restore, dual operators, and a non-expired signed package complete.",
    retryable: false,
  })
}
