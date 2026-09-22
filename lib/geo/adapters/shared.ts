export type RawRowLike = Record<string, unknown>

export function str(row: RawRowLike, key: string): string | null {
  const value = row[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function settingsOf(row: RawRowLike): RawRowLike {
  const value = row.settings
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRowLike)
    : {}
}

export function coordinatesFrom(
  latSource: unknown,
  lngSource: unknown
): { latitude: number; longitude: number } | null {
  if (latSource == null || lngSource == null) return null
  const latitude = Number(latSource)
  const longitude = Number(lngSource)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}
