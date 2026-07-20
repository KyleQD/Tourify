import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_OPS_DISCLAIMER } from "@/lib/music/creator-multilateral-treaty-operations/treaty-ops-disclaimer"
import { resolveCreatorTreatyOpsFlags } from "@/lib/music/creator-multilateral-treaty-operations/creator-treaty-ops-flags"
import { evaluatePhase17Activation } from "@/lib/music/creator-multilateral-treaty-operations/phase17-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyOpsFlags(supabase, user.id)
  if (!flags.creator_treaty_ops_readiness_enabled && !flags.creator_treaty_ops_multi_year_evidence_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty ops readiness packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase17_approval_packages")
    .select("id, package_key, status, title, legal_character, jurisdiction, dual_control, multi_year_evidence_verified, public_notice_complete, independent_review_complete, sunset_at, policy_version, schema_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load readiness packages.", retryable: true })

  return NextResponse.json({
    data: data || [],
    activation: evaluatePhase17Activation({
      multiYearEvidence: false,
      effectiveAuthority: false,
      reviewMandate: false,
      independentOperators: 0,
      tourifyUnavailablePassed: false,
      remediesReady: false,
      publicApproval: false,
      criticalBlockers: 1,
      scope: [],
      jurisdiction: [],
      expiresAt: "",
      rollbackReady: false,
    }),
    disclaimer: CREATOR_TREATY_OPS_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "activation_execution_blocked",
    message: "Treaty-operations activation remains blocked until real multi-year evidence, dual control, reviews, exact scope, and sunset package complete.",
    retryable: false,
  })
}
