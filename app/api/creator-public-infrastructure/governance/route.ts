import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { evaluateGovernanceDecision } from "@/lib/music/creator-public-infrastructure/governance-decision"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_transparency_log_enabled && !flags.creator_public_infrastructure_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Governance transparency stubs are not available.", retryable: false })

  const { data: decisions } = await supabase
    .from("creator_public_governance_decisions")
    .select("id, entity_id, decision_type, status, policy_version, approved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(25)

  const { data: incidents } = await supabase
    .from("creator_public_incidents")
    .select("id, severity, status, public_summary, started_at, resolved_at")
    .order("started_at", { ascending: false })
    .limit(25)

  const decisionGate = evaluateGovernanceDecision({
    quorumMet: false,
    conflictsCleared: false,
    publicCommentComplete: false,
    requiredIndependentApproval: true,
    independentApprovalRecorded: false,
    overridesLocalDecision: false,
  })

  return NextResponse.json({
    data: { decisions: decisions || [], incidents: incidents || [], decisionGate },
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Sandbox transparency stubs only.",
    enabled: true,
  })
}
