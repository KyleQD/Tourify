import type { JukeboxTrack } from "@/contexts/jukebox-context"

export function resolveJukeboxCoverUrl(
  trackId?: string | null,
  coverUrl?: string | null
): string | undefined {
  if (!coverUrl) return undefined
  if (coverUrl.startsWith("/api/music/cover")) return coverUrl
  if (!trackId) return coverUrl
  return `/api/music/cover?trackId=${encodeURIComponent(trackId)}`
}

interface FeedTrack {
  id: string
  title: string
  author?: { id: string; name: string; avatar_url?: string | null }
  metadata?: {
    genre?: string
    duration?: number
    tags?: string[]
    url?: string
    artist?: string
  }
  cover_image?: string | null
  engagement?: { likes?: number; views?: number }
}

function feedTrackToJukeboxTrack(item: FeedTrack): JukeboxTrack {
  return {
    id: item.id,
    title: item.title,
    artist_name: item.author?.name || item.metadata?.artist || "Unknown Artist",
    artist_id: item.author?.id,
    artist_avatar_url: item.author?.avatar_url || undefined,
    duration: item.metadata?.duration ?? undefined,
    file_url: item.metadata?.url || `/api/music/stream?trackId=${item.id}`,
    cover_art_url: resolveJukeboxCoverUrl(item.id, item.cover_image),
    genre: item.metadata?.genre || undefined,
    tags: item.metadata?.tags || [],
    listing_id: (item.metadata as any)?.listingId || (item.metadata as any)?.listing_id || null,
    access_mode: (item.metadata as any)?.accessMode || (item.metadata as any)?.access_mode || undefined,
    allow_library_add: (item.metadata as any)?.allowLibraryAdd ?? (item.metadata as any)?.allow_library_add,
  }
}

export async function fetchDiscoverTracks({
  genre,
  sortBy = "recent",
  limit = 30,
}: {
  genre?: string
  sortBy?: "recent" | "popular" | "trending"
  limit?: number
} = {}): Promise<JukeboxTrack[]> {
  const params = new URLSearchParams({ limit: String(limit), sortBy })
  if (genre && genre !== "all") params.set("genre", genre)

  const res = await fetch(`/api/feed/music?${params}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  const items: FeedTrack[] = json.content || []
  return items.filter((t) => Boolean(t.id)).map(feedTrackToJukeboxTrack)
}

export async function fetchFollowingTracks({
  sortBy = "recent",
  limit = 30,
  offset = 0,
}: {
  sortBy?: "recent" | "popular"
  limit?: number
  offset?: number
} = {}): Promise<{ data: JukeboxTrack[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sortBy,
  })

  const res = await fetch(`/api/jukebox/following-tracks?${params}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return { data: [], total: 0 }
  const json = await res.json()
  const data = Array.isArray(json.data)
    ? json.data.map((track: JukeboxTrack) => ({
        ...track,
        cover_art_url: resolveJukeboxCoverUrl(track.id, track.cover_art_url),
      }))
    : []
  return { data, total: json.total ?? data.length }
}

export interface JukeboxPlaylist {
  id: string
  title: string
  description: string | null
  visibility: "private" | "public" | "unlisted"
  owner_user_id?: string
  created_at?: string
  items?: JukeboxPlaylistItem[]
}

export interface JukeboxPlaylistItem {
  id: string
  music_track_id: string
  artist_music?: {
    id: string
    title: string
    genre?: string | null
    duration?: number | null
    cover_art_url?: string | null
    file_url?: string | null
    user_id?: string
  } | null
}

export async function fetchUserPlaylists({
  includeItems = true,
}: { includeItems?: boolean } = {}): Promise<JukeboxPlaylist[]> {
  const params = new URLSearchParams()
  if (includeItems) params.set("includeItems", "true")

  const res = await fetch(`/api/music/playlists?${params}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json.data) ? json.data : []
}

export function playlistItemsToTracks(
  items: JukeboxPlaylistItem[]
): JukeboxTrack[] {
  return items
    .filter((item) => item.artist_music?.id || item.music_track_id)
    .map((item) => {
      const trackId = item.artist_music?.id || item.music_track_id
      return {
        id: trackId,
        title: item.artist_music?.title || "Untitled",
        artist_name: "Artist",
        artist_id: item.artist_music?.user_id,
        duration: item.artist_music?.duration ?? undefined,
        file_url: item.artist_music?.file_url || `/api/music/stream?trackId=${trackId}`,
        cover_art_url: resolveJukeboxCoverUrl(
          trackId,
          item.artist_music?.cover_art_url
        ),
        genre: item.artist_music?.genre ?? undefined,
      }
    })
}

export async function createPlaylist(
  title: string,
  description?: string,
  visibility: "private" | "public" | "unlisted" = "private"
): Promise<JukeboxPlaylist | null> {
  const res = await fetch("/api/music/playlists", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description: description || null, visibility }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data || null
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
  const res = await fetch(`/api/music/playlists/${playlistId}`, {
    method: "DELETE",
    credentials: "include",
  })
  return res.ok
}

export async function addTrackToPlaylist(
  playlistId: string,
  musicTrackId: string
): Promise<boolean> {
  const res = await fetch(`/api/music/playlists/${playlistId}/items`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicTrackId }),
  })
  return res.ok
}

export interface LibraryItem {
  id: string
  music_track_id: string
  listing_id: string | null
  seller_user_id: string | null
  artist_music: {
    id: string
    title: string
    genre: string | null
    duration: number | null
    cover_art_url: string | null
    file_url: string | null
  } | null
}

export async function fetchLibraryTracks(): Promise<JukeboxTrack[]> {
  const res = await fetch("/api/music/library", {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  const items: LibraryItem[] = Array.isArray(json.data) ? json.data : []
  return items
    .filter((item) => item.artist_music?.id || item.music_track_id)
    .map((item) => {
      const trackId = item.artist_music?.id || item.music_track_id
      return {
        id: trackId,
        title: item.artist_music?.title || "Untitled",
        artist_name: "Artist",
        duration: item.artist_music?.duration ?? undefined,
        file_url: item.artist_music?.file_url || `/api/music/stream?trackId=${trackId}`,
        cover_art_url: resolveJukeboxCoverUrl(
          trackId,
          item.artist_music?.cover_art_url
        ),
        genre: item.artist_music?.genre ?? undefined,
        in_library: true,
      }
    })
}

export async function checkLibraryStatus(musicId: string): Promise<boolean> {
  const res = await fetch(`/api/music/library?musicId=${encodeURIComponent(musicId)}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return false
  const json = await res.json()
  return json.inLibrary === true
}

export async function fetchSocialStatus(
  musicIds: string[]
): Promise<Record<string, { liked: boolean; inLibrary: boolean }>> {
  const ids = Array.from(new Set(musicIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const res = await fetch("/api/music/social-status", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicIds: ids.slice(0, 100) }),
  })
  if (!res.ok) return {}
  const json = await res.json()
  return (json.data || {}) as Record<string, { liked: boolean; inLibrary: boolean }>
}

export async function addTrackToLibrary(
  musicId: string
): Promise<{ ok: boolean; alreadyInLibrary?: boolean; message?: string }> {
  const res = await fetch("/api/music/library", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicId }),
  })

  if (res.ok) {
    const json = await res.json()
    return {
      ok: true,
      alreadyInLibrary: Boolean(json.data?.source && json.data.source !== "free_add"),
    }
  }

  let message = "Failed to add to library"
  try {
    const body = await res.json()
    message = extractApiErrorMessage(body, message)
  } catch {}

  return { ok: false, message }
}

function extractApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback
  const record = body as Record<string, unknown>
  if (typeof record.message === "string" && record.message.trim()) return record.message
  if (typeof record.error === "string" && record.error.trim()) return record.error
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message
  }
  return fallback
}

export async function toggleLike(
  musicId: string
): Promise<{ liked: boolean } | null> {
  const res = await fetch("/api/music/like", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function checkLikeStatus(
  musicId: string
): Promise<boolean> {
  const res = await fetch(`/api/music/like?musicId=${musicId}`, {
    credentials: "include",
  })
  if (!res.ok) return false
  const json = await res.json()
  return json.liked === true
}

export async function shareTrack(
  musicId: string,
  createPost = true
): Promise<boolean> {
  const res = await fetch("/api/music/share", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicId, createPost }),
  })
  return res.ok
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  itemId: string
): Promise<boolean> {
  const res = await fetch(
    `/api/music/playlists/${playlistId}/items?itemId=${itemId}`,
    { method: "DELETE", credentials: "include" }
  )
  return res.ok
}

export async function updatePlaylist(
  playlistId: string,
  updates: { title?: string; description?: string | null; visibility?: "private" | "public" | "unlisted" }
): Promise<boolean> {
  const res = await fetch(`/api/music/playlists/${playlistId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return res.ok
}

export async function reorderPlaylistItem(
  playlistId: string,
  itemId: string,
  position: number
): Promise<boolean> {
  const res = await fetch(`/api/music/playlists/${playlistId}/items`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, position }),
  })
  return res.ok
}

export async function updateTrack(
  id: string,
  updates: Record<string, unknown>
): Promise<{ data: any } | null> {
  const res = await fetch("/api/artist/music", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deleteTrack(id: string): Promise<boolean> {
  const res = await fetch("/api/artist/music", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  return res.ok
}

export async function fetchArtistTracks({
  limit = 100,
  offset = 0,
  genre,
  isPublic,
}: {
  limit?: number
  offset?: number
  genre?: string
  isPublic?: boolean
} = {}): Promise<{ data: JukeboxTrack[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (genre) params.set("genre", genre)
  if (isPublic !== undefined) params.set("is_public", String(isPublic))

  const res = await fetch(`/api/artist/music?${params}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return { data: [], total: 0 }
  const json = await res.json()
  const tracks = (json.data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    artist_name: "You",
    duration: t.duration ?? undefined,
    file_url: t.file_url || "",
    cover_art_url: resolveJukeboxCoverUrl(t.id, t.cover_art_url),
    genre: t.genre ?? undefined,
    tags: t.tags ?? [],
    is_public: t.is_public,
    allow_downloads: t.allow_downloads,
  }))
  return { data: tracks, total: json.total ?? tracks.length }
}

export async function getStreamUrl(trackId: string): Promise<string | null> {
  const res = await fetch(`/api/music/stream?trackId=${trackId}`, {
    credentials: "include",
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.url || null
}

export async function fetchFavoriteTracks({
  userId,
  limit = 50,
  offset = 0,
}: {
  userId?: string
  limit?: number
  offset?: number
} = {}): Promise<{ data: JukeboxTrack[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (userId) params.set("userId", userId)

  const res = await fetch(`/api/music/favorites?${params}`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return { data: [], total: 0 }
  const json = await res.json()
  const data = Array.isArray(json.data)
    ? json.data.map((track: JukeboxTrack) => ({
        ...track,
        cover_art_url: resolveJukeboxCoverUrl(track.id, track.cover_art_url),
      }))
    : []
  return { data, total: json.total ?? data.length }
}

export async function fetchUserFavoritesForProfile(
  userId: string,
  limit = 10
): Promise<JukeboxTrack[]> {
  const result = await fetchFavoriteTracks({ userId, limit })
  return result.data
}

