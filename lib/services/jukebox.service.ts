import type { JukeboxTrack } from "@/contexts/jukebox-context"

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
    file_url: item.metadata?.url || "",
    cover_art_url: item.cover_image || undefined,
    genre: item.metadata?.genre || undefined,
    tags: item.metadata?.tags || [],
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
  return items.filter((t) => t.metadata?.url).map(feedTrackToJukeboxTrack)
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
  return res.json()
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
    .filter((item) => item.artist_music?.file_url)
    .map((item) => ({
      id: item.artist_music!.id,
      title: item.artist_music!.title,
      artist_name: "Artist",
      artist_id: item.artist_music!.user_id,
      duration: item.artist_music!.duration ?? undefined,
      file_url: item.artist_music!.file_url!,
      cover_art_url: item.artist_music!.cover_art_url ?? undefined,
      genre: item.artist_music!.genre ?? undefined,
    }))
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
    .filter((item) => item.artist_music?.file_url)
    .map((item) => ({
      id: item.artist_music!.id,
      title: item.artist_music!.title,
      artist_name: "Artist",
      duration: item.artist_music!.duration ?? undefined,
      file_url: item.artist_music!.file_url!,
      cover_art_url: item.artist_music!.cover_art_url ?? undefined,
      genre: item.artist_music!.genre ?? undefined,
      in_library: true,
    }))
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
    cover_art_url: t.cover_art_url ?? undefined,
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
  return res.json()
}

export async function fetchUserFavoritesForProfile(
  userId: string,
  limit = 10
): Promise<JukeboxTrack[]> {
  const result = await fetchFavoriteTracks({ userId, limit })
  return result.data
}

