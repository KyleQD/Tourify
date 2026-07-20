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
  if (!flags.creator_treaty_ops_readiness_enabled && !flags.creator_treaty_ops_public_registries_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty operations status is not available.", retryable: false })

  const [{ data: cycles }, { data: packages }, { data: blockers }] = await Promise.all([
    supabase
      .from("creator_treaty_ops_operation_cycles")
      .select("id, public_name, state, claims_formal_depositary, claims_competence_expansion, production_authority, jurisdiction, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("future_phase17_approval_packages")
      .select("id, package_key, status, legal_character, title, multi_year_evidence_verified, sunset_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("phase17_blockers")
      .select("id, blocker_code, severity, status, description, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  const activation = evaluatePhase17Activation({
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
  })

  return NextResponse.json({
    data: {
      operationCycles: cycles || [],
      approvalPackages: packages || [],
      openBlockers: blockers || [],
      legalClaims: {
        formalDepositary: false,
        article102Registration: false,
        privilege: false,
        assessedContributions: false,
        competenceExpansion: false,
        universalIdentity: false,
        collectiveAuthority: false,
        externalPublicActivation: false,
      },
      activation,
    },
    disclaimer: CREATOR_TREATY_OPS_DISCLAIMER,
    note: "No live treaty system, formal depositary, competence expansion, or collective authority exists.",
    enabled: true,
  })
}
