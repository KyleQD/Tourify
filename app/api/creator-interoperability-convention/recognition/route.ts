import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_CONVENTION_DISCLAIMER } from "@/lib/music/creator-interoperability-convention/interop-convention-disclaimer"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"
import { evaluateMutualRecognition } from "@/lib/music/creator-interoperability-convention/mutual-recognition-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
  if (!flags.creator_interop_mutual_recognition_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Mutual recognition is not available.", retryable: false })

  if (flags.creator_interop_treaty_status_enabled || flags.creator_interop_universal_representation_enabled)
    return jsonError({
      status: 403,
      code: "hard_gated",
      message: "Treaty status and universal representation remain hard-disabled.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("creator_interop_recognitions")
    .select("id, network_id, source_type, source_id, source_version, status, purpose, disputed, revoked, claims_treaty_status, claims_universal_representation, fresh_until, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "recognition_query_failed", message: "Unable to load recognitions.", retryable: true })

  const projected = (data || []).map((row: any) => ({
    ...row,
    gate: evaluateMutualRecognition({
      sourceCompactActive: row.status === "active" || row.status === "proposed",
      targetCompactActive: true,
      purposeApproved: true,
      sourceFresh: Boolean(row.fresh_until),
      localReservedPowersRespected: true,
      claimsTreatyStatus: row.claims_treaty_status,
      claimsUniversalRepresentation: row.claims_universal_representation,
      containsSensitiveEvidence: false,
    }),
  }))

  return NextResponse.json({
    data: projected,
    disclaimer: CREATOR_INTEROP_CONVENTION_DISCLAIMER,
    note: "Phase 13 constitutions referenced as inputs only — never rewritten.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "recognition_write_blocked",
    message: "Mutual recognition writes remain blocked until multi-compact approval package executes.",
    retryable: false,
  })
}
