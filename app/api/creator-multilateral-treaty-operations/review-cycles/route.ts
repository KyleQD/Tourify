import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_OPS_DISCLAIMER } from "@/lib/music/creator-multilateral-treaty-operations/treaty-ops-disclaimer"
import { resolveCreatorTreatyOpsFlags } from "@/lib/music/creator-multilateral-treaty-operations/creator-treaty-ops-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyOpsFlags(supabase, user.id)
  if (!flags.creator_treaty_ops_periodic_review_enabled && !flags.creator_treaty_ops_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Periodic review cycles are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_treaty_ops_periodic_review_cycles")
    .select("id, operation_cycle_id, mandate_status, scope, baseline_at, review_state, next_review_at, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "review_cycles_query_failed", message: "Unable to load review cycles.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_TREATY_OPS_DISCLAIMER,
    note: "Sandbox periodic-review cycles only. Competence cannot expand by review outcome.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "review_cycle_activation_blocked",
    message: "Review-cycle production activation remains blocked until the Phase 17 activation gate and approval package execute.",
    retryable: false,
  })
}
