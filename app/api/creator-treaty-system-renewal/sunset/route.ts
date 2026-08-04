import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_RENEWAL_DISCLAIMER } from "@/lib/music/creator-treaty-system-renewal/renewal-disclaimer"
import { resolveCreatorTreatyRenewalFlags } from "@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags"
import { evaluateNonPerpetuity } from "@/lib/music/creator-treaty-system-renewal/non-perpetuity-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyRenewalFlags(supabase, user.id)
  if (!flags.creator_treaty_renewal_sunset_enabled && !flags.creator_treaty_renewal_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Sunset/renewal lifecycle is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_treaty_renewal_sunset_decisions")
    .select("id, renewal_cycle_id, mode, status, public_notice_complete, remedy_preserved, effective_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "sunset_query_failed", message: "Unable to load sunset decisions.", retryable: true })

  return NextResponse.json({
    data: data || [],
    nonPerpetuity: evaluateNonPerpetuity({
      now: new Date(),
      currentAuthorityValid: false,
      renewalDecisionEffective: false,
      unresolvedCriticalBlocker: true,
    }),
    disclaimer: CREATOR_TREATY_RENEWAL_DISCLAIMER,
    note: "Silence never renews authority.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "sunset_execution_blocked",
    message: "Sunset/renewal execution remains blocked until an affirmative, scoped, expiring approval package is executed.",
    retryable: false,
  })
}
