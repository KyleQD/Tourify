import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

interface BuildEmployerFromSearchParamsArgs {
  searchParams: Record<string, string | string[] | undefined>
  fallbackDisplayName?: string
}

function getParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key]
  if (Array.isArray(value)) return value[0]
  return value
}

function isHiringEntityType(value: string | undefined): value is HiringEntityType {
  return value === "venue" || value === "organization" || value === "artist"
}

export function buildEmployerFromSearchParams({
  searchParams,
  fallbackDisplayName = "Selected account",
}: BuildEmployerFromSearchParamsArgs): HiringEntity | null {
  const legacyVenueId = getParam(searchParams, "venue_id")
  const entityTypeParam = getParam(searchParams, "entity_type")
  const entityIdParam = getParam(searchParams, "entity_id")
  const displayName = getParam(searchParams, "display_name") || fallbackDisplayName

  if (legacyVenueId) {
    return {
      entityType: "venue",
      entityId: legacyVenueId,
      displayName,
      scope: {
        venueId: legacyVenueId,
        eventId: getParam(searchParams, "event_id"),
        tourId: getParam(searchParams, "tour_id"),
      },
    }
  }

  if (!isHiringEntityType(entityTypeParam) || !entityIdParam) return null

  return {
    entityType: entityTypeParam,
    entityId: entityIdParam,
    displayName,
    scope: {
      venueId: getParam(searchParams, "venue_id"),
      eventId: getParam(searchParams, "event_id"),
      tourId: getParam(searchParams, "tour_id"),
    },
  }
}
