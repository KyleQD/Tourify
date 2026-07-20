import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  assertOwnedProject,
  assertOwnedTrack,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  track_id: z.string().uuid(),
  musical_work_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300).optional(),
  isrc: z.string().max(20).optional().nullable(),
  recording_type: z.enum(["original", "cover", "remix", "live", "remaster", "sample_based", "unknown"]).default("original"),
  original_release_date: z.string().optional().nullable(),
})

const patchSchema = z.object({
  recording_id: z.string().uuid(),
  musical_work_id: z.string().uuid().nullable().optional(),
  isrc: z.string().max(20).optional().nullable(),
  recording_type: z.enum(["original", "cover", "remix", "live", "remaster", "sample_based", "unknown"]).optional(),
  title: z.string().min(1).max(300).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase.from("music_rights_sound_recordings").select("*").eq("owner_user_id", user.id).order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_recordings_query_failed", message: "Unable to load sound recordings.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_rights_workspace_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_workspace_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights workspace is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })
    if (project.artist_music_id !== payload.track_id)
      return jsonError({ status: 400, code: "track_mismatch", message: "Recording must link to the project track.", retryable: false })

    const track = await assertOwnedTrack({ supabase: trusted, userId: user.id, trackId: payload.track_id })
    if (!track) return jsonError({ status: 404, code: "track_not_found", message: "Track not found.", retryable: false })

    const { data: existing } = await trusted
      .from("music_rights_sound_recordings")
      .select("*")
      .eq("artist_music_id", track.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const { data, error } = await trusted
      .from("music_rights_sound_recordings")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        artist_music_id: track.id,
        musical_work_id: payload.musical_work_id || null,
        title: payload.title || track.title || project.title,
        isrc: payload.isrc || null,
        recording_type: payload.recording_type,
        original_release_date: payload.original_release_date || track.release_date || null,
      })
      .select("*")
      .single()
    if (error || !data)
      return jsonError({ status: 500, code: "rights_recording_create_failed", message: "Unable to create sound recording.", retryable: true })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.recording.linked",
        entityType: "sound_recording",
        entityId: data.id,
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.recording.linked",
        dedupeKey: `recording:${data.id}:linked`,
        payload: { recordingId: data.id, trackId: track.id },
      }),
    ])

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid sound recording request.", issues: error.issues })
    console.error("Rights recording create failed", error)
    return jsonError({ status: 500, code: "rights_recording_internal_error", message: "Unexpected sound recording error.", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_workspace_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights workspace is not available.", retryable: false })

    const payload = patchSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (payload.musical_work_id !== undefined) updates.musical_work_id = payload.musical_work_id
    if (payload.isrc !== undefined) updates.isrc = payload.isrc
    if (payload.recording_type) updates.recording_type = payload.recording_type
    if (payload.title) updates.title = payload.title

    const { data, error } = await trusted
      .from("music_rights_sound_recordings")
      .update(updates)
      .eq("id", payload.recording_id)
      .eq("owner_user_id", user.id)
      .select("*")
      .maybeSingle()
    if (error) return jsonError({ status: 500, code: "rights_recording_update_failed", message: "Unable to update sound recording.", retryable: true })
    if (!data) return jsonError({ status: 404, code: "recording_not_found", message: "Sound recording not found.", retryable: false })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid sound recording update.", issues: error.issues })
    return jsonError({ status: 500, code: "rights_recording_internal_error", message: "Unexpected sound recording error.", retryable: true })
  }
}
