import type {
  DiscoverAlbum,
  DiscoverMusicTrack,
  DiscoverProfile,
} from "@/lib/discover/types"

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export function scoreSongEngagement({
  likes = 0,
  plays = 0,
}: {
  likes?: number
  plays?: number
}) {
  return Number(likes || 0) * 2 + Number(plays || 0)
}

export function rankTopSongs(
  tracks: DiscoverMusicTrack[],
  limit: number,
  nowMs = Date.now()
): DiscoverMusicTrack[] {
  const recentCutoff = nowMs - NINETY_DAYS_MS
  const recent = tracks.filter((track) => {
    if (!track.created_at) return true
    const created = new Date(track.created_at).getTime()
    if (Number.isNaN(created)) return true
    return created >= recentCutoff
  })

  const pool = recent.length > 0 ? recent : tracks
  const byId = new Map<string, DiscoverMusicTrack>()

  for (const track of pool) {
    if (!track.id || !track.file_url) continue
    const existing = byId.get(track.id)
    if (!existing) {
      byId.set(track.id, track)
      continue
    }
    if (scoreSongEngagement(track) > scoreSongEngagement(existing))
      byId.set(track.id, track)
  }

  return [...byId.values()]
    .sort((a, b) => scoreSongEngagement(b) - scoreSongEngagement(a))
    .slice(0, limit)
}

export function selectTopAlbumsByGenre(
  albums: DiscoverAlbum[],
  genreCount = 8
): DiscoverAlbum[] {
  const genreTotals = new Map<string, number>()
  const bestByGenre = new Map<string, DiscoverAlbum>()

  for (const album of albums) {
    const genre = String(album.genre || "").trim()
    if (!genre || !album.id) continue

    const score = scoreSongEngagement({
      likes: album.likes,
      plays: album.plays,
    })
    genreTotals.set(genre, (genreTotals.get(genre) || 0) + score)

    const current = bestByGenre.get(genre)
    if (!current || score > scoreSongEngagement(current))
      bestByGenre.set(genre, album)
  }

  const rankedGenres = [...genreTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)

  const selected: DiscoverAlbum[] = []
  const usedIds = new Set<string>()

  for (const genre of rankedGenres) {
    if (selected.length >= genreCount) break
    const album = bestByGenre.get(genre)
    if (!album || usedIds.has(album.id)) continue
    selected.push(album)
    usedIds.add(album.id)
  }

  if (selected.length >= genreCount) return selected

  const remaining = albums
    .filter((album) => album.id && !usedIds.has(album.id) && album.genre)
    .sort(
      (a, b) =>
        scoreSongEngagement({ likes: b.likes, plays: b.plays }) -
        scoreSongEngagement({ likes: a.likes, plays: a.plays })
    )

  for (const album of remaining) {
    if (selected.length >= genreCount) break
    selected.push(album)
    usedIds.add(album.id)
  }

  return selected
}

export function rankNewArtists(
  artists: DiscoverProfile[],
  limit: number
): DiscoverProfile[] {
  return [...artists]
    .filter((artist) => artist.account_type === "artist" && artist.username)
    .sort((a, b) => {
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
      if (aCreated !== bCreated) return bCreated - aCreated
      return (a.stats.followers || 0) - (b.stats.followers || 0)
    })
    .slice(0, limit)
}
