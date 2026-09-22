import { coordinatesFrom, str, type RawRowLike } from "./shared"

/**
 * `artist_events`: venue_city/venue_state/venue_country plus coordinates when
 * the actual row shape carries them (top level or nested location object).
 */
export function extractFromArtistEvent(row: RawRowLike) {
  const locationRaw = row.location
  const nested =
    locationRaw && typeof locationRaw === "object" && !Array.isArray(locationRaw)
      ? (locationRaw as RawRowLike)
      : {}
  return {
    coordinates: coordinatesFrom(
      row.latitude ?? nested.latitude,
      row.longitude ?? nested.longitude
    ),
    hierarchy: {
      city: str(row, "venue_city") ?? str(nested, "city"),
      admin1: str(row, "venue_state") ?? str(nested, "state"),
      country: str(row, "venue_country") ?? str(nested, "country"),
    },
    freeText: str(row, "venue_name") ?? str(nested, "name"),
  }
}
