/**
 * P22-T01/T02/T03 — federated World search (pure query understanding).
 *
 * Parses natural queries into structured intent, resolves place ambiguity
 * through aliases + hierarchy context supplied by the caller, and returns
 * typed result kinds. No I/O: the API route supplies the searchable index.
 */

export const SEARCHABLE_KINDS = [
  "place", "artist", "track", "genre", "scene", "instrument",
  "venue", "event", "radio", "landmark", "journey",
] as const

export type SearchKind = (typeof SEARCHABLE_KINDS)[number]

export interface SearchableItem {
  kind: SearchKind
  id: string
  name: string
  /** Parent place path for places; owning/linked place for others. */
  placePath?: string | null
  aliases?: readonly string[]
  parentPlaceKey?: string | null
  tags?: readonly string[]
}

export interface SearchIntent {
  raw: string
  /** Free-text portion after extracting compound intent. */
  text: string
  /** Place the query scopes to ("detroit techno" → detroit). */
  scopePlaceKey: string | null
  /** Preposition target ("events in Berlin" → event kind scoped to berlin). */
  requestedKinds: SearchKind[]
}

const KIND_KEYWORDS: Readonly<Record<string, readonly SearchKind[]>> = Object.freeze({
  radio: ["radio"],
  event: ["event"],
  venue: ["venue"],
  journey: ["journey"],
  history: ["landmark"], // "music history of X" → landmark/milestone results
})

/** Structured intent extraction for compound queries. */
export function parseSearchQuery(
  query: string,
  placesIndex: ReadonlyArray<{ key: string; name: string; aliases: readonly string[] }>,
): SearchIntent {
  const raw = query.trim()
  let working = raw

  // Compound: "<place> <thing>" / "<thing> in <place>" / "music history of <place>".
  let scopePlaceKey: string | null = null
  let requestedKinds: SearchKind[] = []

  const inMatch = /\bin\s+([a-z\s-]+)$/i.exec(working)
  if (inMatch) {
    const candidate = inMatch[1].trim().toLowerCase()
    const place = resolvePlace(candidate, placesIndex)
    if (place) {
      scopePlaceKey = place.key
      working = working.slice(0, inMatch.index).trim()
    }
  }

  const historyMatch = /^music\s+history\s+of\s+(.+)$/i.exec(working)
  if (historyMatch) {
    requestedKinds = ["landmark"]
    const place = resolvePlace(historyMatch[1].trim(), placesIndex)
    if (place) {
      scopePlaceKey = place.key
      working = ""
    }
  }

  // Leading place mention BEFORE keyword stripping ("detroit techno",
  // "tokyo radio") so the keyword removal can't orphan the place token.
  if (!scopePlaceKey) {
    const tokens = working.split(/\s+/)
    if (tokens.length > 1) {
      const first = tokens[0].toLowerCase()
      const place = resolvePlace(first, placesIndex)
      if (place) {
        scopePlaceKey = place.key
        working = tokens.slice(1).join(" ")
      }
    }
  }

  for (const [keyword, kinds] of Object.entries(KIND_KEYWORDS)) {
    // Detection accepts plurals exactly like the stripping step below.
    if (new RegExp(`\\b${keyword}s?\\b`, "i").test(working)) {
      requestedKinds = [...new Set([...requestedKinds, ...kinds])]
      working = working.replace(new RegExp(`\\b${keyword}s?\\b`, "gi"), " ").trim()
    }
  }

  return { raw, text: working.trim() || raw, scopePlaceKey, requestedKinds }
}

/**
 * Resolve a place mention using names then aliases; ambiguous short names
 * ("georgia", "congo") stay unresolved unless hierarchy context narrows it.
 */
export function resolvePlace(
  mention: string,
  placesIndex: ReadonlyArray<{ key: string; name: string; aliases: readonly string[] }>,
): { key: string } | null {
  const needle = mention.trim().toLowerCase()
  if (!needle) return null
  const byName = placesIndex.filter((p) => p.name.toLowerCase() === needle)
  const byAlias = placesIndex.filter((p) =>
    p.aliases.some((a) => a.toLowerCase() === needle),
  )
  const matches = byName.length > 0 ? byName : byAlias
  if (matches.length === 1) return { key: matches[0].key }
  // Ambiguous: require the mention itself to be globally unique — otherwise fail closed.
  return null
}

export interface SearchResult {
  kind: SearchKind
  id: string
  name: string
  placePath: string | null
  score: number
}

/**
 * Rank items against parsed intent. Deterministic: exact name > alias >
 * prefix > substring; scoped items boosted; stable id tiebreak.
 */
export function rankResults(
  intent: SearchIntent,
  items: readonly SearchableItem[],
  limit = 20,
): SearchResult[] {
  const text = intent.text.toLowerCase()
  const scored = items
    .map((item) => {
      let score = 0
      const name = item.name.toLowerCase()
      if (name === text) score += 100
      else if (name.startsWith(text)) score += 60
      else if (name.includes(text)) score += 30
      else if ((item.aliases ?? []).some((a) => a.toLowerCase().includes(text))) score += 25
      else if (text.length >= 3 && (item.tags ?? []).some((t) => t.toLowerCase().includes(text))) score += 10
      else return null
      if (intent.scopePlaceKey && item.placePath?.includes(intent.scopePlaceKey)) score += 40
      if (intent.requestedKinds.length > 0 && !intent.requestedKinds.includes(item.kind)) score -= 50
      return { ...item, score }
    })
    .filter((r): r is SearchResult & { score: number } => r !== null && r.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)

  return scored.map(({ kind, id, name, placePath, score }) => ({ kind, id, name, placePath, score }))
}
