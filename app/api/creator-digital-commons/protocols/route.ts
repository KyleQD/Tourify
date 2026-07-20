import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateProtocolChange } from "@/lib/music/creator-digital-commons/protocol-change-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_protocol_governance_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Protocol governance is not available.", retryable: false })

  const [{ data: protocols }, { data: versions }] = await Promise.all([
    supabase
      .from("creator_commons_protocols")
      .select("id, slug, status, current_version, governance_policy_version, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_commons_protocol_versions")
      .select("id, protocol_id, version, status, specification_hash, effective_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const changeGate = evaluateProtocolChange({
    publicProposal: false,
    compatibilityAnalysis: false,
    privacyReview: false,
    securityReview: false,
    accessibilityReview: false,
    implementationEvidenceCount: 0,
    conformanceVectorsReady: false,
    migrationAndRollbackReady: false,
    emergency: false,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: { protocols: protocols || [], versions: versions || [], changeGate },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    enabled: true,
  })
}
