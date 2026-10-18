import type { JukeboxTrack } from "@/contexts/jukebox-context"

/**
 * Stable deterministic daily discovery fallback. A scheduled editorial pick
 * should supersede this once the curation endpoint is available.
 *
 * All users with the same public track pool and UTC day get the same pick.
 * A changing discovery pool can change the pick, so this is not an editorial
 * or permanently pinned daily selection.
 */
export function pickDailyTrack(tracks: JukeboxTrack[], day: string): JukeboxTrack | null {
  if (!tracks.length) return null

  function score(id: string) {
    let hash = 2166136261
    const input = day + ":" + id
    for (let i = 0; i < input.length; i++) {
      hash = Math.imul(hash ^ input.charCodeAt(i), 16777619)
    }
    return hash >>> 0
  }

  return tracks.reduce((best, track) => (
    score(track.id) < score(best.id) ? track : best
  ))
}

/** Display only unique, eligible free-to-play public discovery items. */
export function uniquePlayableTracks(tracks: JukeboxTrack[]): JukeboxTrack[] {
  const seen = new Set<string>()
  return tracks.filter((track) => {
    if (!track.id || !track.title || track.access_mode === "paid" || seen.has(track.id)) {
      return false
    }
    seen.add(track.id)
    return true
  })
}
