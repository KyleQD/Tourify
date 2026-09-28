import { coordinatesFrom, settingsOf, str, type RawRowLike } from "./shared"

/**
 * `events_v2`: settings JSON carries venue_* geography. venues_v2 is
 * intentionally sparse in the reconciled baseline, so a venue_id implies no
 * rich geography here.
 */
export function extractFromEventV2(row: RawRowLike) {
  const settings = settingsOf(row)
  return {
    coordinates: coordinatesFrom(settings.latitude, settings.longitude),
    hierarchy: {
      city: str(settings, "venue_city"),
      admin1: str(settings, "venue_state"),
      country: str(settings, "venue_country"),
    },
    freeText: str(settings, "venue_name") ?? str(settings, "venue_address"),
  }
}
