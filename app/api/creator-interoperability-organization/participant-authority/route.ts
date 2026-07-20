import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_ORG_DISCLAIMER } from "@/lib/music/creator-interoperability-organization/organization-disclaimer"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"
import { canBindParticipant } from "@/lib/music/creator-interoperability-organization/participant-authority"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
  if (!flags.creator_interop_org_participant_applications_enabled && !flags.creator_interop_org_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Participant authority sandbox is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_interop_org_participant_authorities")
    .select("id, participant_external_ref, participant_class, authority_type, jurisdiction, effective_at, expires_at, suspended_at, revoked_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "authority_query_failed", message: "Unable to load participant authorities.", retryable: true })

  const evaluated = (data || []).map((row: any) => ({
    ...row,
    canBind: canBindParticipant({
      participantClass: row.participant_class,
      authorityInstrumentCurrent: Boolean(row.effective_at) && !row.revoked_at,
      signatoryAuthorized: false,
      internalApprovalComplete: false,
      effective: Boolean(row.effective_at) && !row.revoked_at,
      suspended: Boolean(row.suspended_at),
    }),
  }))

  return NextResponse.json({
    data: evaluated,
    disclaimer: CREATOR_INTEROP_ORG_DISCLAIMER,
    note: "No membership is inferred from Tourify accounts or Phase 14 participation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "membership_activation_blocked",
    message: "Membership and binding authority activation remain blocked in the first implementation slice.",
    retryable: false,
  })
}
