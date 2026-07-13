import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { enqueueMusicPreviewJob } from "@/lib/music/preview-jobs"

export const dynamic = "force-dynamic"

const previewJobSchema = z.object({
  musicId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const payload = previewJobSchema.parse(await request.json())
    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, user_id, storage_bucket, storage_path, preview_mode, preview_duration_seconds")
      .eq("id", payload.musicId)
      .single()

    if (trackError || !track) {
      return jsonError({
        status: 404,
        code: "track_not_found",
        message: "Track not found",
        retryable: false,
      })
    }
    if (track.user_id !== user.id) {
      return jsonError({
        status: 403,
        code: "forbidden",
        message: "You can only generate previews for your own tracks.",
        retryable: false,
      })
    }
    if (track.preview_mode !== "clip") {
      return jsonError({
        status: 400,
        code: "preview_not_required",
        message: "This track is configured for full playback and does not need a generated preview.",
        retryable: false,
      })
    }
    if (!track.storage_path) {
      return jsonError({
        status: 400,
        code: "source_audio_required",
        message: "A full audio storage path is required before generating a preview.",
        retryable: false,
      })
    }

    const job = await enqueueMusicPreviewJob({
      supabase,
      musicId: track.id,
      artistUserId: user.id,
      sourceBucket: track.storage_bucket || "artist-music",
      sourcePath: track.storage_path,
      durationSeconds: track.preview_duration_seconds || 15,
      metadata: { source: "api_artist_music_preview_jobs" },
    })

    return NextResponse.json({ data: { job, previewStatus: "pending" } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid preview job request", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected preview job error", error)
    return jsonError({
      status: 500,
      code: "preview_job_internal_error",
      message: "Unable to queue preview generation.",
      retryable: true,
    })
  }
}
