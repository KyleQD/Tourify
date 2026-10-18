import type { JukeboxTrack } from "@/contexts/jukebox-context"

export type JukeboxMood = "chill" | "energy" | "focus" | "adventure"
export type JukeboxDecade = "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020s"
export type JukeboxCity = "Las Vegas" | "Santa Barbara" | "Ibiza" | "Los Angeles" | "New York" | "Tokyo"

export const MOOD_OPTIONS: { id: JukeboxMood; name: string; description: string }[] = [
  { id: "chill", name: "Chill", description: "Easygoing & mellow" },
  { id: "energy", name: "Energy", description: "High tempo & lively" },
  { id: "focus", name: "Focus", description: "Instrumental & atmospheric" },
  { id: "adventure", name: "Explore", description: "A little bit of everything" },
]

export const DECADES: JukeboxDecade[] = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]
export const CITIES: JukeboxCity[] = ["Las Vegas", "Santa Barbara", "Ibiza", "Los Angeles", "New York", "Tokyo"]

const MOOD_TERMS: Record<Exclude<JukeboxMood, "adventure">, string[]> = {
  chill: ["chill", "ambient", "downtempo", "lofi", "lo-fi", "acoustic", "soul", "jazz", "mellow"],
  energy: ["dance", "electronic", "edm", "techno", "house", "rock", "punk", "metal", "dnb", "drum and bass", "upbeat"],
  focus: ["instrumental", "ambient", "classical", "soundtrack", "study", "focus", "minimal", "lofi", "lo-fi"],
}

function normalized(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase()
}

export function tracksForMood(tracks: JukeboxTrack[], mood: JukeboxMood): JukeboxTrack[] {
  if (mood === "adventure") return tracks
  const terms = MOOD_TERMS[mood]
  return tracks.filter((track) => {
    const descriptors = [track.genre || "", ...(track.tags || [])].map(normalized)
    return descriptors.some((value) => terms.some((term) => value === term || value.startsWith(term + " ") || value.endsWith(" " + term)))
  })
}

/**
 * Historical era mode is intentionally strict: upload date is NOT release date.
 * Only explicitly tagged release years/decades qualify. Don't invent the era.
 */
export function tracksForDecade(tracks: JukeboxTrack[], decade: JukeboxDecade): JukeboxTrack[] {
  const firstYear = Number.parseInt(decade, 10)
  return tracks.filter((track) => (track.tags || []).some((tag) => {
    const value = normalized(tag)
    const decadeTag = /^(?:decade|era)\s*[:=]\s*(\d{4})s$/.exec(value)
    if (decadeTag) return Number(decadeTag[1]) === firstYear
    const yearTag = /^(?:release[_ -]?year|year)\s*[:=]\s*(\d{4})$/.exec(value)
    if (!yearTag) return false
    const year = Number(yearTag[1])
    return year >= firstYear && year < firstYear + 10
  }))
}

/** Uses an explicit city metadata tag only; genre names aren't geographic evidence. */
export function tracksForCity(tracks: JukeboxTrack[], city: JukeboxCity): JukeboxTrack[] {
  const target = normalized(city)
  return tracks.filter((track) => (track.tags || []).some((tag) => {
    const value = /^(?:city|scene|hometown)\s*[:=]\s*(.+)$/.exec(normalized(tag))
    return value?.[1] === target
  }))
}

export function secretCompanionTrack(tracks: JukeboxTrack[], daily: JukeboxTrack | null): {
  track: JukeboxTrack
  reason: string
} | null {
  if (!daily) return null
  const others = tracks.filter((track) => track.id !== daily.id)
  const sameArtist = others.find((track) => Boolean(daily.artist_id) && track.artist_id === daily.artist_id)
  if (sameArtist) return { track: sameArtist, reason: "Another track by today's artist" }
  const sameGenre = others.find((track) => Boolean(daily.genre) && normalized(track.genre) === normalized(daily.genre))
  if (sameGenre) return { track: sameGenre, reason: "A related genre discovery" }
  return null
}

/** Stable, unique pseudo-shuffle for local crate digging; never replaces licensing checks. */
export function crateTracks(tracks: JukeboxTrack[], seed: number, excludeId?: string, limit = 3): JukeboxTrack[] {
  const input = tracks.filter((track) => track.id !== excludeId)
  function hash(id: string): number {
    let h = (2166136261 ^ seed) >>> 0
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    return h >>> 0
  }
  return [...input].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id)).slice(0, limit)
}
