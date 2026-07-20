import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { evaluateOperator } from "@/lib/music/creator-protocol-constitution/operator-constitutional-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_operator_constitution_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Operator constitution is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_operators")
    .select("id, constitution_id, display_name, operator_class, status, accreditation_expires_at, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "operators_query_failed", message: "Unable to load operators.", retryable: true })

  const gate = evaluateOperator({
    accreditationStatus: "suspended",
    jurisdictionApproved: false,
    serviceLevelsCurrent: false,
    independentKeys: false,
    exitPackageCurrent: false,
    constitutionalConflict: false,
  })

  return NextResponse.json({
    data: data || [],
    accreditation: gate,
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Sandbox operator schedule only — production needs two independent operators.",
    enabled: true,
  })
}
