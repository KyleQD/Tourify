import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_ORG_DISCLAIMER } from "@/lib/music/creator-interoperability-organization/organization-disclaimer"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"
import { evaluateOrganizationActivation } from "@/lib/music/creator-interoperability-organization/organization-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
  if (!flags.creator_interop_org_entity_options_enabled && !flags.creator_interop_org_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Feasibility packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase15_approval_packages")
    .select("id, package_key, status, title, legal_character, jurisdiction, dual_control, legal_feasibility_signed, constitutive_path_approved, independent_review_complete, policy_version, schema_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load feasibility packages.", retryable: true })

  return NextResponse.json({
    data: data || [],
    activation: evaluateOrganizationActivation({
      phase14EvidenceApproved: false,
      legalFeasibilityApproved: false,
      constitutiveInstrumentEffective: false,
      participantAuthorityVerified: false,
      governanceOperational: false,
      hostAndHeadquartersReady: false,
      fundingAndBudgetApproved: false,
      oversightAndStaffJusticeReady: false,
      privacySecurityAccessibilityApproved: false,
      independentOperationProven: false,
      criticalBlockers: 1,
    }),
    disclaimer: CREATOR_INTEROP_ORG_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "feasibility_execution_blocked",
    message: "Feasibility package execution remains blocked until signed legal opinion, dual control, and reviews complete.",
    retryable: false,
  })
}
