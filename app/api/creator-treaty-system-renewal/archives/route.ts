import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_RENEWAL_DISCLAIMER } from "@/lib/music/creator-treaty-system-renewal/renewal-disclaimer"
import { resolveCreatorTreatyRenewalFlags } from "@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyRenewalFlags(supabase, user.id)
  if (!flags.creator_treaty_renewal_archives_enabled && !flags.creator_treaty_renewal_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Archive packages are not available.", retryable: false })

  const [{ data: packages }, { data: restores }] = await Promise.all([
    supabase
      .from("creator_treaty_renewal_archive_packages")
      .select("id, package_key, content_hash, retention_class, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_treaty_renewal_restore_exercises")
      .select("id, archive_package_id, status, tourify_unavailable, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  return NextResponse.json({
    data: {
      packages: packages || [],
      restoreExercises: restores || [],
    },
    disclaimer: CREATOR_TREATY_RENEWAL_DISCLAIMER,
    note: "Sandbox archive metadata and restore drills only. Public archive access remains hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "archive_custody_blocked",
    message: "Archive custody transfer and public archive access remain blocked in the first implementation slice.",
    retryable: false,
  })
}
