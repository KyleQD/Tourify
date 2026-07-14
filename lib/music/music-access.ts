export type MusicAccessLevel = "preview" | "full"

export interface MusicAccessTrack {
  id: string
  user_id: string
  storage_bucket?: string | null
  storage_path?: string | null
  preview_storage_bucket?: string | null
  preview_storage_path?: string | null
  preview_status?: string | null
  preview_error?: string | null
  preview_generated_at?: string | null
  is_public?: boolean | null
  is_visible?: boolean | null
  moderation_status?: string | null
  access_mode?: string | null
  preview_mode?: string | null
  preview_file_url?: string | null
  file_url?: string | null
  allow_library_add?: boolean | null
  allow_profile_feature?: boolean | null
  allow_downloads?: boolean | null
  rights_confirmed?: boolean | null
  stats?: Record<string, unknown> | null
}

export interface MusicAccessResult {
  allowed: boolean
  accessLevel: MusicAccessLevel
  reason?: "auth_required" | "not_visible" | "not_entitled" | "no_audio"
  isOwner: boolean
  isEntitled: boolean
}

export function isTrackPubliclyPlayable(track: MusicAccessTrack) {
  return (
    track.is_public === true &&
    track.is_visible !== false &&
    (track.moderation_status || "approved") === "approved" &&
    track.rights_confirmed === true
  )
}

export async function resolveMusicAccess({
  supabase,
  track,
  viewerUserId,
}: {
  supabase: any
  track: MusicAccessTrack
  viewerUserId?: string | null
}): Promise<MusicAccessResult> {
  const isOwner = Boolean(viewerUserId && viewerUserId === track.user_id)
  if (isOwner) {
    return { allowed: true, accessLevel: "full", isOwner, isEntitled: true }
  }

  const isPublic = isTrackPubliclyPlayable(track)
  if (!isPublic) {
    return {
      allowed: false,
      accessLevel: "preview",
      reason: "not_visible",
      isOwner,
      isEntitled: false,
    }
  }

  let isEntitled = false
  if (viewerUserId) {
    const { data: libraryEntry } = await supabase
      .from("user_music_library")
      .select("id")
      .eq("buyer_user_id", viewerUserId)
      .eq("music_track_id", track.id)
      .maybeSingle()
    isEntitled = Boolean(libraryEntry)
  }

  if (isEntitled) {
    return { allowed: true, accessLevel: "full", isOwner, isEntitled: true }
  }

  if ((track.access_mode || "free") === "free" && track.preview_mode !== "clip") {
    return { allowed: true, accessLevel: "full", isOwner, isEntitled: true }
  }

  if (track.preview_mode === "clip" && (track.preview_status || "ready") === "ready" && getTrackPreviewStoragePath(track)) {
    return { allowed: true, accessLevel: "preview", isOwner, isEntitled: false }
  }

  return {
    allowed: false,
    accessLevel: "preview",
    reason: viewerUserId ? "not_entitled" : "auth_required",
    isOwner,
    isEntitled: false,
  }
}

export function extractArtistMusicStoragePath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null
  try {
    const url = new URL(fileUrl)
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/artist-music\/(.+)/)
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {}
  return null
}

export function getTrackFullStoragePath(track: MusicAccessTrack): string | null {
  return track.storage_path || extractArtistMusicStoragePath(track.file_url)
}

export function getTrackPreviewStoragePath(track: MusicAccessTrack): string | null {
  return track.preview_storage_path || extractArtistMusicStoragePath(track.preview_file_url)
}

export function getTrackStorageBucket(track: MusicAccessTrack, accessLevel: MusicAccessLevel): string {
  if (accessLevel === "preview") return track.preview_storage_bucket || "artist-music"
  return track.storage_bucket || "artist-music"
}

export async function getTrustedMusicWriteClient(fallbackSupabase: any) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackSupabase
  }
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    return createServiceRoleClient()
  } catch {
    return fallbackSupabase
  }
}

export async function recordMusicEvent({
  supabase,
  musicId,
  artistUserId,
  actorUserId,
  eventType,
  accessLevel,
  source,
  metadata,
}: {
  supabase: any
  musicId: string
  artistUserId?: string | null
  actorUserId?: string | null
  eventType:
    | "stream_issued"
    | "play"
    | "play_started"
    | "play_progress"
    | "play_completed"
    | "preview_play"
    | "full_play"
    | "library_add"
    | "profile_feature"
    | "like"
    | "comment"
    | "share"
    | "purchase"
    | "download"
    | "report"
  accessLevel?: MusicAccessLevel | null
  source?: string | null
  metadata?: Record<string, unknown>
}) {
  const writeClient = await getTrustedMusicWriteClient(supabase)
  const { error } = await writeClient.from("music_engagement_events").insert({
    music_id: musicId,
    artist_user_id: artistUserId || null,
    actor_user_id: actorUserId || null,
    event_type: eventType,
    access_level: accessLevel || null,
    source: source || null,
    metadata: metadata || {},
  })
  if (error) console.error("Failed to record music event", error)
}

export async function syncMusicStats(supabase: any, musicId: string) {
  const writeClient = await getTrustedMusicWriteClient(supabase)
  const [{ count: plays }, { count: likes }, { count: comments }, { count: shares }, { count: libraryAdds }, { count: downloads }] =
    await Promise.all([
      writeClient.from("music_plays").select("id", { count: "exact", head: true }).eq("music_id", musicId),
      writeClient.from("music_likes").select("id", { count: "exact", head: true }).eq("music_id", musicId),
      writeClient.from("music_comments").select("id", { count: "exact", head: true }).eq("music_id", musicId),
      writeClient.from("music_engagement_events").select("id", { count: "exact", head: true }).eq("music_id", musicId).eq("event_type", "share"),
      writeClient.from("music_engagement_events").select("id", { count: "exact", head: true }).eq("music_id", musicId).eq("event_type", "library_add"),
      writeClient.from("music_engagement_events").select("id", { count: "exact", head: true }).eq("music_id", musicId).eq("event_type", "download"),
    ])

  const stats = {
    plays: plays || 0,
    likes: likes || 0,
    comments: comments || 0,
    shares: shares || 0,
    library_adds: libraryAdds || 0,
    downloads: downloads || 0,
  }

  await writeClient.from("artist_music").update({ stats }).eq("id", musicId)
  return stats
}
