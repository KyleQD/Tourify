import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"

export const dynamic = "force-dynamic"

const shortlistSchema = z.object({
  project_id: z.string().uuid(),
  artist_music_id: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_briefs_enabled || !flags.music_licensing_availability_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing discovery is not available.", retryable: false })

  const projectId = request.nextUrl.searchParams.get("project_id")
  const { data: availability } = await supabase
    .from("music_license_availability")
    .select("id, artist_music_id, status, right_category, territories, valid_until")
    .in("status", ["pre_cleared", "quote_required", "approval_required", "inquiry_only"])
    .limit(50)

  // Default-deny: never surface conflicted/expired/unavailable as licensable search hits
  const eligible = (availability || []).filter((row: any) =>
    !["conflicted", "expired", "unavailable", "not_configured", "temporarily_unavailable"].includes(row.status),
  )

  let shortlist: any[] = []
  if (projectId) {
    const { data } = await supabase
      .from("music_licensing_shortlists")
      .select("id, project_id, artist_music_id, notes, availability_snapshot, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50)
    shortlist = data || []
  }

  return NextResponse.json({
    data: { candidates: eligible, shortlist },
    disclaimer: LICENSING_DISCLAIMER,
    note: "Search results are not licences. Incomplete/disputed authority stays inquiry_only/manual/unavailable.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_briefs_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing discovery is not available.", retryable: false })

    const payload = shortlistSchema.parse(await request.json())
    const { data: avail } = await supabase
      .from("music_license_availability")
      .select("id, status, right_category, territories")
      .eq("artist_music_id", payload.artist_music_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabase
      .from("music_licensing_shortlists")
      .insert({
        project_id: payload.project_id,
        artist_music_id: payload.artist_music_id,
        notes: payload.notes || null,
        availability_snapshot: avail || { status: "not_configured" },
        created_by: user.id,
      })
      .select("id, project_id, artist_music_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "shortlist_create_failed", message: "Unable to shortlist track.", retryable: true })

    return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid shortlist payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "shortlist_create_failed", message: "Unable to shortlist track.", retryable: true })
  }
}
