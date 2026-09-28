import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { evaluateIdentifierResolution } from "@/lib/music/creator-treaty-system-legacy/identifier-resolution-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (
    !flags.creator_treaty_legacy_identifier_resolution_enabled &&
    !flags.creator_treaty_legacy_protocol_resolution_enabled &&
    !flags.creator_treaty_legacy_readiness_enabled
  )
    return jsonError({ status: 404, code: "feature_disabled", message: "Identifier/protocol resolution is not available.", retryable: false })

  const [{ data: identifiers }, { data: protocols }] = await Promise.all([
    supabase
      .from("creator_treaty_legacy_identifier_resolutions")
      .select("id, identifier_ref, resolution_target, status, creates_universal_identity, adjudicates_ownership, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_treaty_legacy_protocol_resolutions")
      .select("id, protocol_ref, successor_spec_ref, status, open_spec, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    data: {
      identifiers: identifiers || [],
      protocols: protocols || [],
    },
    resolutionGate: evaluateIdentifierResolution({
      identifierRef: "",
      createsUniversalIdentity: false,
      adjudicatesOwnership: false,
      openSpecCompatible: true,
    }),
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
    note: "Resolution stubs only. Universal identity and ownership adjudication remain hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "resolution_execution_blocked",
    message: "Live identifier/protocol resolution that creates universal identity or adjudicates ownership remains blocked.",
    retryable: false,
  })
}
