import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export type MusicPreviewStatus = "not_required" | "pending" | "ready" | "failed"

export interface EnqueueMusicPreviewJobInput {
  supabase: any
  musicId: string
  artistUserId: string
  sourceBucket?: string | null
  sourcePath: string
  durationSeconds?: number | null
  metadata?: Record<string, unknown>
}

export async function enqueueMusicPreviewJob({
  supabase,
  musicId,
  artistUserId,
  sourceBucket,
  sourcePath,
  durationSeconds,
  metadata,
}: EnqueueMusicPreviewJobInput) {
  const writeClient = await getTrustedMusicWriteClient(supabase)
  const safeDuration = Math.min(Math.max(Math.round(Number(durationSeconds) || 15), 1), 600)

  await writeClient
    .from("music_preview_generation_jobs")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
      error: "superseded_by_new_preview_job",
    })
    .eq("music_id", musicId)
    .in("status", ["queued", "failed"])

  const { data: job, error: jobError } = await writeClient
    .from("music_preview_generation_jobs")
    .insert({
      music_id: musicId,
      artist_user_id: artistUserId,
      source_bucket: sourceBucket || "artist-music",
      source_path: sourcePath,
      preview_bucket: "artist-music",
      duration_seconds: safeDuration,
      status: "queued",
      metadata: metadata || {},
    })
    .select("*")
    .single()

  if (jobError || !job) {
    await writeClient
      .from("artist_music")
      .update({
        preview_status: "failed",
        preview_error: jobError?.message || "preview_job_create_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", musicId)
      .eq("user_id", artistUserId)
    throw jobError || new Error("Unable to create preview job")
  }

  await writeClient
    .from("artist_music")
    .update({
      preview_status: "pending",
      preview_error: null,
      preview_storage_bucket: null,
      preview_storage_path: null,
      preview_file_url: null,
      preview_generated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", musicId)
    .eq("user_id", artistUserId)

  return job
}

export function previewStatusForTrack({
  previewMode,
  previewStoragePath,
  previewFileUrl,
}: {
  previewMode?: string | null
  previewStoragePath?: string | null
  previewFileUrl?: string | null
}): MusicPreviewStatus {
  if (previewMode !== "clip") return "not_required"
  if (previewStoragePath || previewFileUrl) return "ready"
  return "pending"
}
