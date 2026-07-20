import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { calculateSection203Candidate } from "@/lib/music/rights-admin/reversion-window"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_cases_enabled && !flags.music_rights_admin_dmca_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Deadlines are not available.", retryable: false })

  const { data: deadlines, error } = await supabase
    .from("music_rights_deadlines")
    .select("id, case_id, dmca_case_id, deadline_type, due_at, status, created_at")
    .eq("status", "open")
    .order("due_at", { ascending: true })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "deadlines_query_failed", message: "Unable to load deadlines.", retryable: true })

  const { data: reversions } = await supabase
    .from("music_rights_reversions")
    .select("id, artist_music_id, status, window_starts_at, window_ends_at")
    .eq("owner_user_id", user.id)
    .limit(50)

  const sampleReversion = calculateSection203Candidate({
    executionDate: new Date("2000-01-01T00:00:00Z"),
    includesPublicationRight: true,
    publicationDate: new Date("2001-01-01T00:00:00Z"),
    workMadeForHire: false,
  })

  return NextResponse.json({
    data: {
      openDeadlines: deadlines || [],
      reversions: reversions || [],
      reversionCandidateNote: sampleReversion,
    },
    disclaimer: RIGHTS_ADMIN_DISCLAIMER,
    note: "Reversion windows are candidates only — not legal determinations.",
    enabled: true,
  })
}
