import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateEmergencyGovernance } from "@/lib/music/creator-digital-commons/emergency-governance-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_public_status_enabled && !flags.creator_digital_commons_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Governance transparency stubs are not available.", retryable: false })

  const [{ data: decisions }, { data: incidents }] = await Promise.all([
    supabase
      .from("creator_commons_governance_decisions")
      .select("id, steward_id, decision_kind, status, policy_version, effective_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("creator_commons_incidents")
      .select("id, incident_kind, severity, status, public_summary, opened_at, closed_at")
      .order("opened_at", { ascending: false })
      .limit(25),
  ])

  const emergency = evaluateEmergencyGovernance({
    enumeratedTrigger: false,
    scopeNarrow: false,
    expirySet: false,
    dualApproval: false,
    independentNotice: false,
    creatorRightsTransfer: false,
    retrospectiveReviewScheduled: false,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: { decisions: decisions || [], incidents: incidents || [], emergency },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Sandbox anti-capture / transparency stubs only.",
    enabled: true,
  })
}
