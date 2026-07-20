import type {
  DiscoverAlbum,
  DiscoverProfile,
  DiscoverTopTrack,
} from "@/lib/discover/types"
import { selectTopAlbumsByGenre } from "@/lib/discover/ranking"

interface SupabaseLike {
  from: (table: string) => any
}

function streamUrlForTrack(trackId: string) {
  return `/api/music/stream?trackId=${trackId}`
}

function statsFromRow(row: Record<string, unknown>) {
  const stats =
    row.stats && typeof row.stats === "object"
      ? (row.stats as Record<string, unknown>)
      : {}
  return {
    plays: Number(row.play_count ?? stats.plays ?? 0),
    likes: Number(row.likes_count ?? stats.likes ?? 0),
  }
}

export async function attachTopTracksToArtists({
  supabase,
  artists,
}: {
  supabase: SupabaseLike
  artists: DiscoverProfile[]
}): Promise<DiscoverProfile[]> {
  const userIds = [
    ...new Set(
      artists
        .map((artist) => artist.owner_user_id || artist.id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (userIds.length === 0) return artists

  const featuredByUser = new Map<string, DiscoverTopTrack>()
  const { data: featuredRows } = await supabase
    .from("user_profile_featured_tracks")
    .select(
      `
      user_id,
      music_track_id,
      is_active,
      artist_music:music_track_id (
        id,
        title,
        duration,
        cover_art_url,
        file_url,
        stats,
        is_public,
        is_visible,
        moderation_status,
        rights_confirmed
      )
    `
    )
    .in("user_id", userIds)
    .eq("is_active", true)

  for (const row of featuredRows || []) {
    const music = Array.isArray(row.artist_music)
      ? row.artist_music[0]
      : row.artist_music
    if (!music?.id) continue
    if (
      music.is_public === false ||
      music.is_visible === false ||
      (music.moderation_status && music.moderation_status !== "approved") ||
      music.rights_confirmed === false
    )
      continue

    const { plays, likes } = statsFromRow(music)
    featuredByUser.set(String(row.user_id), {
      id: String(music.id),
      title: String(music.title || "Untitled"),
      file_url: streamUrlForTrack(String(music.id)),
      cover_art_url: music.cover_art_url || null,
      duration: music.duration ?? null,
      plays,
      likes,
    })
  }

  const missingUserIds = userIds.filter((id) => !featuredByUser.has(id))
  const fallbackByUser = new Map<string, DiscoverTopTrack>()

  if (missingUserIds.length > 0) {
    const { data: trackRows } = await supabase
      .from("artist_music")
      .select(
        "id, user_id, title, duration, cover_art_url, file_url, stats, created_at"
      )
      .in("user_id", missingUserIds)
      .eq("is_public", true)
      .eq("is_visible", true)
      .eq("moderation_status", "approved")
      .eq("rights_confirmed", true)
      .order("created_at", { ascending: false })
      .limit(Math.min(missingUserIds.length * 8, 200))

    for (const row of trackRows || []) {
      const userId = String(row.user_id || "")
      if (!userId) continue
      const { plays, likes } = statsFromRow(row)
      const current = fallbackByUser.get(userId)
      const candidateScore = likes * 2 + plays
      const currentScore =
        Number(current?.likes || 0) * 2 + Number(current?.plays || 0)
      if (current && candidateScore <= currentScore) continue
      fallbackByUser.set(userId, {
        id: String(row.id),
        title: String(row.title || "Untitled"),
        file_url: streamUrlForTrack(String(row.id)),
        cover_art_url: row.cover_art_url || null,
        duration: row.duration ?? null,
        plays,
        likes,
      })
    }
  }

  return artists.map((artist) => {
    const userId = artist.owner_user_id || artist.id
    return {
      ...artist,
      top_track: featuredByUser.get(userId) || fallbackByUser.get(userId) || null,
    }
  })
}

export async function fetchTopAlbumsByGenre({
  supabase,
  limit = 8,
}: {
  supabase: SupabaseLike
  limit?: number
}): Promise<DiscoverAlbum[]> {
  const { data: albumRows, error } = await supabase
    .from("artist_music")
    .select(
      "id, user_id, title, genre, cover_art_url, file_url, release_date, stats, created_at, type"
    )
    .in("type", ["album", "ep"])
    .eq("is_public", true)
    .eq("is_visible", true)
    .eq("moderation_status", "approved")
    .eq("rights_confirmed", true)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[Discover] Failed to load albums:", error)
    return []
  }

  const rows = albumRows || []
  const userIds = [
    ...new Set(rows.map((row: any) => String(row.user_id)).filter(Boolean)),
  ]

  let profileMap: Record<
    string,
    { full_name: string | null; username: string | null }
  > = {}
  let artistSlugByUserId: Record<string, string> = {}

  if (userIds.length > 0) {
    const [{ data: profiles }, { data: artists }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", userIds),
      supabase
        .from("artist_profiles")
        .select("user_id, url_slug, artist_name")
        .in("user_id", userIds),
    ])

    profileMap = (profiles || []).reduce(
      (acc: Record<string, { full_name: string | null; username: string | null }>, profile: any) => {
        acc[String(profile.id)] = {
          full_name: profile.full_name || null,
          username: profile.username || null,
        }
        return acc
      },
      {}
    )

    artistSlugByUserId = (artists || []).reduce(
      (acc: Record<string, string>, artist: any) => {
        if (artist.url_slug) acc[String(artist.user_id)] = String(artist.url_slug)
        return acc
      },
      {}
    )
  }

  const albums: DiscoverAlbum[] = rows
    .map((row: any) => {
      const genre = String(row.genre || "").trim()
      if (!genre) return null
      const profile = profileMap[String(row.user_id)]
      const artistName =
        profile?.full_name ||
        artistSlugByUserId[String(row.user_id)] ||
        profile?.username ||
        "Artist"
      const { plays, likes } = statsFromRow(row)

      return {
        id: String(row.id),
        title: String(row.title || "Untitled"),
        artist_name: artistName,
        artist_id: String(row.user_id),
        artist_username:
          artistSlugByUserId[String(row.user_id)] || profile?.username || null,
        cover_art_url: row.cover_art_url || null,
        file_url: row.file_url ? streamUrlForTrack(String(row.id)) : undefined,
        genre,
        plays,
        likes,
        release_date: row.release_date || row.created_at || null,
      } satisfies DiscoverAlbum
    })
    .filter(Boolean) as DiscoverAlbum[]

  return selectTopAlbumsByGenre(albums, limit)
}
