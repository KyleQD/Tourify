import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  assertOwnedTrack,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:projects", limit: 30, windowSec: 60 })

const createSchema = z.object({
  track_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  idempotency_key: z.string().min(8).max(200).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const trackId = request.nextUrl.searchParams.get("trackId")
  let query = supabase
    .from("music_rights_projects")
    .select("*, music_rights_sound_recordings(id, public_id, title, isrc, musical_work_id), music_rights_musical_works(id, public_id, title, iswc)")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
  if (trackId) query = query.eq("artist_music_id", trackId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_projects_query_failed", message: "Unable to load rights projects.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_rights_workspace_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many rights project requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_workspace_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights workspace is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const track = await assertOwnedTrack({ supabase: trusted, userId: user.id, trackId: payload.track_id })
    if (!track) return jsonError({ status: 404, code: "track_not_found", message: "Track not found.", retryable: false })

    const { data: existing } = await trusted
      .from("music_rights_projects")
      .select("*")
      .eq("artist_music_id", track.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const title = payload.title || track.title || "Untitled rights project"
    const { data: project, error } = await trusted
      .from("music_rights_projects")
      .insert({
        owner_user_id: user.id,
        artist_music_id: track.id,
        title,
        status: "draft",
        metadata: payload.idempotency_key ? { idempotency_key: payload.idempotency_key } : {},
      })
      .select("*")
      .single()
    if (error || !project)
      return jsonError({ status: 500, code: "rights_project_create_failed", message: "Unable to create rights project.", retryable: true })

    const { data: work } = await trusted
      .from("music_rights_musical_works")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        title,
      })
      .select("*")
      .single()

    const { data: recording, error: recordingError } = await trusted
      .from("music_rights_sound_recordings")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        artist_music_id: track.id,
        musical_work_id: work?.id || null,
        title,
        original_release_date: track.release_date || null,
        duration_seconds: typeof track.duration === "number" ? track.duration : null,
      })
      .select("*")
      .single()
    if (recordingError)
      return jsonError({ status: 500, code: "rights_recording_link_failed", message: "Unable to link sound recording to track.", retryable: true })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.project.created",
        entityType: "project",
        entityId: project.id,
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.project.created",
        dedupeKey: `project:${project.id}:created`,
        payload: { projectId: project.id, trackId: track.id, recordingId: recording?.id, workId: work?.id },
      }),
    ])

    return NextResponse.json({ data: { ...project, work, recording } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid rights project request.", issues: error.issues })
    console.error("Rights project create failed", error)
    return jsonError({ status: 500, code: "rights_project_internal_error", message: "Unexpected rights project error.", retryable: true })
  }
}
