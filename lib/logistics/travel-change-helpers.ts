export type TravelChangeKind =
  | 'flight_changed'
  | 'flight_delayed'
  | 'flight_cancelled'
  | 'lodging_changed'
  | 'lodging_cancelled'
  | 'transport_changed'

export function diffMaterialFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields: readonly string[],
): string[] {
  if (!before || !after) return []
  const changed: string[] = []
  for (const field of fields) {
    const left = normalizeValue(before[field])
    const right = normalizeValue(after[field])
    if (left !== right) changed.push(field)
  }
  return changed
}

function normalizeValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value)
}

export function resolveFlightNotifyType(status?: string | null): TravelChangeKind {
  const value = (status || '').toLowerCase()
  if (value === 'cancelled' || value === 'canceled') return 'flight_cancelled'
  if (value === 'delayed') return 'flight_delayed'
  return 'flight_changed'
}

export function resolveLodgingNotifyType(status?: string | null): TravelChangeKind {
  const value = (status || '').toLowerCase()
  if (value === 'cancelled' || value === 'canceled') return 'lodging_cancelled'
  return 'lodging_changed'
}
