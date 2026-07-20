const STOP_WORDS = new Set(["the", "of", "and", "in", "on", "at", "near"])

/** Split a free-form location like "Austin, Texas" into searchable tokens. */
export function tokenizeLocation(location: string | null | undefined): string[] {
  if (!location?.trim()) return []

  return location
    .toLowerCase()
    .split(/[\s,|/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function fieldMatchesToken(field: string, token: string): boolean {
  if (!field || !token) return false
  if (field.includes(token)) return true
  // Allow city-name fragments to match longer geocode tokens (e.g. "angeles" in "los angeles")
  // Require field length >= 3 so 2-letter state codes like "TX" do not match "texas".
  if (field.length >= 3 && token.length >= 3 && token.includes(field)) return true
  return false
}

/** True when any location token matches any of the provided place fields. */
export function matchesLocationFields(
  location: string | null | undefined,
  ...fields: Array<string | null | undefined>
): boolean {
  const tokens = tokenizeLocation(location)
  if (tokens.length === 0) return false

  const normalizedFields = fields
    .map((field) => String(field || "").toLowerCase().trim())
    .filter(Boolean)

  if (normalizedFields.length === 0) return false

  return tokens.some((token) =>
    normalizedFields.some((field) => fieldMatchesToken(field, token))
  )
}

/** Build a PostgREST `or(...)` filter from location tokens against column paths. */
export function buildLocationOrFilter(
  location: string | null | undefined,
  columns: string[]
): string | null {
  const tokens = tokenizeLocation(location)
  if (tokens.length === 0 || columns.length === 0) return null

  const clauses: string[] = []
  for (const token of tokens) {
    const escaped = token.replace(/[%_,.()]/g, "")
    if (!escaped) continue
    for (const column of columns) {
      clauses.push(`${column}.ilike.%${escaped}%`)
    }
  }

  return clauses.length > 0 ? clauses.join(",") : null
}

export function sortEventsByLocationBoost<
  T extends {
    venue_city?: string | null
    venue_state?: string | null
    city?: string | null
    state?: string | null
    attendance?: { total?: number } | null
    event_date?: string | null
  },
>(events: T[], location: string | null | undefined): T[] {
  if (!location?.trim()) return events

  return [...events].sort((first, second) => {
    const firstNearby = matchesLocationFields(
      location,
      first.venue_city,
      first.venue_state,
      first.city,
      first.state
    )
    const secondNearby = matchesLocationFields(
      location,
      second.venue_city,
      second.venue_state,
      second.city,
      second.state
    )
    if (firstNearby !== secondNearby) return firstNearby ? -1 : 1

    const popularityDelta =
      Number(second.attendance?.total || 0) - Number(first.attendance?.total || 0)
    if (popularityDelta !== 0) return popularityDelta

    const firstDate = first.event_date
      ? new Date(first.event_date).getTime()
      : Number.MAX_SAFE_INTEGER
    const secondDate = second.event_date
      ? new Date(second.event_date).getTime()
      : Number.MAX_SAFE_INTEGER
    return firstDate - secondDate
  })
}

export function mergeEventSourcesSoft<T>(sources: Array<T[] | null | undefined>): T[] {
  const merged: T[] = []
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    merged.push(...source)
  }
  return merged
}

export function isEventsV2PubliclyListable(event: {
  settings?: Record<string, unknown> | null
} | null | undefined): boolean {
  const settings =
    event?.settings && typeof event.settings === "object" ? event.settings : {}

  if (settings.is_public === false) return false
  if (settings.visibility === "private" || settings.visibility === "unlisted")
    return false

  return true
}
