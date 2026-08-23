/**
 * MusicBrainz staging adapter (PILOT_INGESTION_SPEC_V0_1 §2/§7).
 * Core data is CC0; one request per second; raw payloads stay private.
 */
import { RateLimiter, fetchJson, sha256json } from "./shared"

const MB_BASE = "https://musicbrainz.org/ws/2"
const limiter = new RateLimiter(1100)

export interface MbArea {
  id: string
  name: string
  type?: string | null
  "sort-name"?: string
}

export interface MbArtist {
  id: string
  name: string
  "sort-name"?: string
  disambiguation?: string | null
  type?: string | null
  country?: string | null
  area?: { name?: string } | null
  "life-span"?: { begin?: string | null }
  tags?: { name: string; count: number }[]
}

export async function mbGet<T>(path: string): Promise<T> {
  await limiter.wait()
  const sep = path.includes("?") ? "&" : "?"
  // Spec §11: failure of one record must not abort the run; transient 503/429
  // get exponential backoff before surfacing.
  return fetchJson<T>(`${MB_BASE}${path}${sep}fmt=json`, { retries: 4, backoffMs: 1100, retryOnBodyError: true })
}

export function normalizeArtist(artist: MbArtist) {
  return {
    mbid: artist.id,
    name: artist.name,
    sortName: artist["sort-name"] ?? null,
    disambiguation: artist.disambiguation ?? null,
    type: artist.type ?? null,
    country: artist.country ?? null,
    area: artist.area?.name ?? null,
    lifeBegin: artist["life-span"]?.begin ?? null,
    topTags: [...(artist.tags ?? [])]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t) => t.name),
  }
}

export function artistPayloadHash(artist: MbArtist): string {
  return sha256json(normalizeArtist(artist))
}

interface MbAreaDetail extends MbArea {
  "iso-3166-1-codes"?: string[]
  "iso-3166-2-codes"?: string[]
}

/**
 * Resolve a city area MBID by exact-name + type City search, then
 * disambiguate same-named cities worldwide by walking "part of"
 * containment ancestors (spec §7: parent/containment relationships).
 */
export async function findCityArea(
  cityName: string,
  expectedAncestors: string[],
  opts: { countryCode?: string | null } = {},
): Promise<MbArea | null> {
  // NOTE: the area search index does NOT support a `country:` field (verified
  // live during P15); same-named cities are disambiguated solely by walking
  // "part of" containment ancestors below. opts.countryCode is accepted for
  // interface stability but intentionally unused until upstream adds support.
  void opts
  // Prefer exact City areas; some capitals only exist at Subdivision level
  // (e.g. Tokyo is typed Subdivision upstream). Both paths require the
  // containment-ancestor proof, so neither can silently guess.
  const queries = [`"${cityName}" AND type:City`, `"${cityName}" AND type:Subdivision`]
  let candidates: MbArea[] = []
  for (const query of queries) {
    const data = await mbGet<{ areas: MbArea[] }>(
      `/area?query=${encodeURIComponent(query)}&limit=25`,
    )
    candidates = (data.areas ?? []).filter(
      (area) => typeof area.name === "string" && area.name.trim().length > 0 && area.name.toLowerCase() === cityName.toLowerCase(),
    )
    if (candidates.length > 0) break
  }
  if (candidates.length === 0) return null
  const wanted = new Set(expectedAncestors.map((name) => name.toLowerCase()))
  for (const candidate of candidates.slice(0, 5)) {
    const visited = new Set<string>([candidate.id])
    let frontier: { id: string }[] = [candidate]
    for (let depth = 0; depth < 4 && frontier.length > 0; depth += 1) {
      const next: { id: string; name?: string }[] = []
      for (const node of frontier) {
        try {
          const detail = await mbGet<{
            relations?: {
              type?: string
              direction?: string
              area?: { id: string; name?: string }
            }[]
          }>(`/area/${node.id}?inc=area-rels`)
          for (const relation of detail.relations ?? []) {
            const target = relation.area
            if (!target?.id || visited.has(target.id)) continue
            // On a looked-up area, BACKWARD "part of" edges point to the
            // containing parent (e.g. Detroit -> Wayne County).
            if ((relation.type ?? "").toLowerCase() !== "part of") continue
            if (relation.direction === "forward") continue
            if (target.name && wanted.has(target.name.toLowerCase())) return candidate
            visited.add(target.id)
            next.push({ id: target.id, name: target.name })
          }
        } catch {
          // A failed branch lookup must not abort the whole probe.
        }
      }
      frontier = next
    }
  }
  return null
}

export async function browseAreaArtistsPage(
  areaMbid: string,
  limit: number,
  offset: number,
): Promise<{ artists: MbArtist[]; count: number }> {
  // Browse syntax: /artist?area=<mbid>  (the /area/{id}/artists path is not
  // a supported JSON browse and silently returns the area lookup).
  const data = await mbGet<{
    artists: MbArtist[]
    "artist-count": number
  }>(`/artist?area=${areaMbid}&limit=${limit}&offset=${offset}`)
  return { artists: data.artists ?? [], count: data["artist-count"] ?? 0 }
}
