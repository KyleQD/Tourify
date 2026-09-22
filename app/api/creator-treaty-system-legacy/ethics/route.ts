import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { evaluateSensitiveArchiveEthics } from "@/lib/music/creator-treaty-system-legacy/sensitive-archive-ethics-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (!flags.creator_treaty_legacy_sensitive_archive_ethics_enabled && !flags.creator_treaty_legacy_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Sensitive archive ethics reviews are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_treaty_legacy_ethics_reviews")
    .select("id, review_key, purpose, status, sensitive_reveal_requested, privacy_override_requested, creator_rights_affected, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "ethics_query_failed", message: "Unable to load ethics reviews.", retryable: true })

  return NextResponse.json({
    data: data || [],
    ethicsGate: evaluateSensitiveArchiveEthics({
      purposeApproved: false,
      ethicsReviewApproved: false,
      sensitiveRevealRequested: false,
      privacyOverrideRequested: false,
      creatorRightsAffected: false,
      publicDumpRequested: false,
    }),
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
    note: "Ethics review stubs only. Public dump and privacy override remain hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "sensitive_reveal_blocked",
    message: "Sensitive archive public dump and privacy override remain blocked.",
    retryable: false,
  })
}
