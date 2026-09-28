type SupabaseLikeError = {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

/**
 * The deployed site-map schema predates the canonical bridge migration and
 * stores its events_v2 foreign key in `event_id`. Prefer `event_v2_id` and use
 * this compatibility path only when PostgREST explicitly says that column is
 * absent from site_maps.
 */
export function isMissingSiteMapEventV2Column(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as SupabaseLikeError
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')

  return (
    /event_v2_id/i.test(text) &&
    /site_maps/i.test(text) &&
    (/schema cache/i.test(text) || /column[\s\S]*does not exist/i.test(text))
  )
}

export function normalizeLegacySiteMapEventScope<T extends Record<string, unknown>>(
  row: T,
): T & { event_v2_id: string | null } {
  return {
    ...row,
    event_v2_id: typeof row.event_id === 'string' ? row.event_id : null,
  }
}
