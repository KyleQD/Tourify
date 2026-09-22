import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { evaluateSuccessorCustody } from "@/lib/music/creator-treaty-system-legacy/successor-custody-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (!flags.creator_treaty_legacy_successor_custody_enabled && !flags.creator_treaty_legacy_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Successor custody is not available.", retryable: false })

  const [{ data: archives }, { data: reviews }] = await Promise.all([
    supabase
      .from("creator_treaty_legacy_successor_archives")
      .select("id, archive_key, custodian_ref, independence_class, status, local_exit_preserved, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_treaty_legacy_custody_reviews")
      .select("id, legacy_cycle_id, custodian_ref, status, independent_archive, local_exit_preserved, verified_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    data: {
      successorArchives: archives || [],
      custodyReviews: reviews || [],
    },
    custodyGate: evaluateSuccessorCustody({
      successorRecognized: false,
      custodyAuthorityVerified: false,
      independentArchive: false,
      localExitPreserved: true,
      claimsPerpetuity: false,
    }),
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
    note: "Sandbox custody metadata only. Century-scale launch remains hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "custody_transfer_blocked",
    message: "Live successor custody transfer remains blocked in the first implementation slice.",
    retryable: false,
  })
}
