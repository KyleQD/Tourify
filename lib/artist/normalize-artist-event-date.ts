/** Normalize legacy / alternate date fields onto a YYYY-MM-DD event_date key. */

export function dateKeyFromValue(value?: string | null): string | null {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  return match?.[1] ?? null
}

export function normalizeArtistEventDate(row: {
  event_date?: string | null
  start_at?: string | null
  date?: string | null
}): string | null {
  return (
    dateKeyFromValue(row.event_date) ||
    dateKeyFromValue(row.start_at) ||
    dateKeyFromValue(row.date)
  )
}
