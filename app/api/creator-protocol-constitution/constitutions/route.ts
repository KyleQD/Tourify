import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { evaluateConstitutionalActivation } from "@/lib/music/creator-protocol-constitution/constitutional-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_constitution_drafting_enabled && !flags.creator_protocol_constitution_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Constitution drafting readiness is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_constitutions")
    .select("id, legal_name, status, charter_version, policy_version, jurisdiction, production_authority, effective_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "constitutions_query_failed", message: "Unable to load constitutions.", retryable: true })

  const activation = evaluateConstitutionalActivation({
    entityApproved: false,
    charterRatified: false,
    localOrganizations: 0,
    independentImplementations: 0,
    independentOperators: 0,
    appealsOperational: false,
    successionTested: false,
    tourifyUnavailableTested: false,
    securityApproved: false,
    privacyApproved: false,
    accessibilityApproved: false,
    fundingApproved: false,
    unresolvedCriticalBlockers: 1,
  })

  return NextResponse.json({
    data: data || [],
    activation,
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Tourify is optional; Phase 12 commons records are inputs only. Not a treaty.",
    enabled: true,
  })
}
