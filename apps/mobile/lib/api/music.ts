import { apiRequest } from "@/lib/api/client"

export type MobileMusicAccessLevel = "preview" | "full"
export type MobileMusicAccessMode = "free" | "paid"

export interface MobileMusicTrack {
  id: string
  title: string
  artist_name?: string | null
  artist_user_id?: string | null
  genre?: string | null
  duration?: number | null
  cover_art_url?: string | null
  access_mode?: MobileMusicAccessMode | null
  preview_mode?: "full" | "clip" | null
  preview_duration_seconds?: number | null
  allow_library_add?: boolean | null
  allow_profile_feature?: boolean | null
  listing_id?: string | null
}

export interface MobileMusicLibraryItem {
  id: string
  created_at: string
  source?: string | null
  listing_id?: string | null
  music_track_id: string
  marketplace_listings?: {
    id: string
    title?: string | null
    cover_image_url?: string | null
    base_price?: number | null
    currency?: string | null
  } | null
  artist_music?: MobileMusicTrack | null
}

interface MusicLibraryResponse {
  data: MobileMusicLibraryItem[]
}

interface MusicFeedCard {
  id: string
  title?: string | null
  cover_image?: string | null
  author?: {
    id?: string | null
    name?: string | null
  } | null
  metadata?: {
    genre?: string | null
    duration?: number | null
    artist?: string | null
    accessMode?: MobileMusicAccessMode | null
    previewMode?: "full" | "clip" | null
    previewDurationSeconds?: number | null
    allowLibraryAdd?: boolean | null
    allowProfileFeature?: boolean | null
    listingId?: string | null
  } | null
}

interface MusicFeedResponse {
  tracks?: MobileMusicTrack[]
  data?: MobileMusicTrack[]
  content?: MusicFeedCard[]
}

interface MusicStreamResponse {
  url: string
  accessLevel: MobileMusicAccessLevel
  expiresIn: number
}

interface ProfileFeaturedTrackResponse {
  data: {
    music_track_id: string
    artist_music?: {
      id: string
      title?: string | null
      genre?: string | null
      duration?: number | null
      cover_art_url?: string | null
      user_id?: string | null
      access_mode?: MobileMusicAccessMode | null
      preview_mode?: "full" | "clip" | null
      preview_duration_seconds?: number | null
      allow_profile_feature?: boolean | null
    } | null
  } | null
}

interface ArtistPublicMusicResponse {
  tracks?: Array<MobileMusicTrack & {
    artist?: string | null
    artist_name?: string | null
    artist_user_id?: string | null
    user_id?: string | null
    listing_price?: number | null
    listing_currency?: string | null
  }>
}

export async function getMusicLibrary(limit = 50) {
  const response = await apiRequest<MusicLibraryResponse>(`/api/music/library?limit=${limit}`)
  return Array.isArray(response.data) ? response.data : []
}

export async function getMusicFeed(limit = 30) {
  const response = await apiRequest<MusicFeedResponse>(`/api/feed/music?limit=${limit}`, {
    authRequired: false,
  })
  if (response.tracks || response.data) return response.tracks ?? response.data ?? []
  return (response.content ?? []).map((item) => ({
    id: item.id,
    title: item.title || "Untitled track",
    artist_name: item.metadata?.artist || item.author?.name || "Artist",
    artist_user_id: item.author?.id || null,
    genre: item.metadata?.genre || null,
    duration: item.metadata?.duration || null,
    cover_art_url: item.cover_image || null,
    access_mode: item.metadata?.accessMode || "free",
    preview_mode: item.metadata?.previewMode || "full",
    preview_duration_seconds: item.metadata?.previewDurationSeconds || 15,
    allow_library_add: item.metadata?.allowLibraryAdd !== false,
    allow_profile_feature: item.metadata?.allowProfileFeature !== false,
    listing_id: item.metadata?.listingId || null,
  }))
}

export async function getMusicStreamUrl(trackId: string) {
  return apiRequest<MusicStreamResponse>(`/api/music/stream?trackId=${encodeURIComponent(trackId)}`, {
    cacheResponse: false,
    preferCachedOnOffline: false,
  })
}

export async function getProfileFeaturedTrack(userId: string) {
  const response = await apiRequest<ProfileFeaturedTrackResponse>(
    `/api/music/profile-featured-track?userId=${encodeURIComponent(userId)}`,
    {
      authRequired: false,
      cacheResponse: false,
    }
  )
  const track = response.data?.artist_music
  if (!track) return null
  return {
    id: response.data?.music_track_id || track.id,
    title: track.title || "Featured track",
    artist_name: "Featured track",
    artist_user_id: track.user_id || null,
    genre: track.genre || null,
    duration: track.duration || null,
    cover_art_url: track.cover_art_url || null,
    access_mode: track.access_mode || "free",
    preview_mode: track.preview_mode || "full",
    preview_duration_seconds: track.preview_duration_seconds || 15,
    allow_library_add: false,
    allow_profile_feature: track.allow_profile_feature !== false,
    listing_id: null,
  } satisfies MobileMusicTrack
}

export async function getArtistPublicMusic(artistOrUserId: string, limit = 20) {
  const response = await apiRequest<ArtistPublicMusicResponse>(
    `/api/artists/${encodeURIComponent(artistOrUserId)}/music?limit=${limit}`,
    {
      authRequired: false,
      cacheResponse: false,
    }
  )

  return (response.tracks || []).map((track) => ({
    id: track.id,
    title: track.title || "Untitled track",
    artist_name: track.artist_name || track.artist || "Artist",
    artist_user_id: track.artist_user_id || track.user_id || null,
    genre: track.genre || null,
    duration: track.duration || null,
    cover_art_url: track.cover_art_url || null,
    access_mode: track.access_mode || "free",
    preview_mode: track.preview_mode || "full",
    preview_duration_seconds: track.preview_duration_seconds || 15,
    allow_library_add: track.allow_library_add !== false,
    allow_profile_feature: track.allow_profile_feature !== false,
    listing_id: track.listing_id || null,
  }))
}

export async function addTrackToLibrary(musicId: string) {
  return apiRequest<{ data: MobileMusicLibraryItem }>("/api/music/library", {
    method: "POST",
    body: JSON.stringify({ musicId }),
  })
}

export async function setProfileFeaturedTrack(musicId: string | null) {
  return apiRequest<{ data: unknown }>("/api/music/profile-featured-track", {
    method: "PATCH",
    body: JSON.stringify({ musicId }),
  })
}

export async function recordMobilePlay({
  musicId,
  accessLevel,
  listenSeconds = 0,
  completed = false,
  source = "mobile_music_tab",
  eventType,
}: {
  musicId: string
  accessLevel: MobileMusicAccessLevel
  listenSeconds?: number
  completed?: boolean
  source?: string
  eventType?: "play_started" | "play_progress"
}) {
  return apiRequest<{ success: boolean }>("/api/music/play", {
    method: "POST",
    body: JSON.stringify({
      musicId,
      accessLevel,
      listenSeconds,
      completed,
      source,
      eventType,
    }),
    skipOfflineQueue: true,
  })
}
