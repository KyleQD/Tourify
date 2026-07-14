export type HiringEntityType = "venue" | "organization" | "artist"

export interface HiringEntityScope {
  eventId?: string
  tourId?: string
  venueId?: string
}

export interface HiringEntity {
  entityType: HiringEntityType
  entityId: string
  displayName: string
  scope?: HiringEntityScope
}

export interface HiringActor {
  userId: string
  employer: HiringEntity
}

export interface ResolveHiringEntityInput {
  userId: string
  entityType?: HiringEntityType
  entityId?: string
  venueId?: string
  eventId?: string
  tourId?: string
  displayName?: string
}

export function isHiringEntityType(value: string | null | undefined): value is HiringEntityType {
  return value === "venue" || value === "organization" || value === "artist"
}

export function toEmployerSearchParams(employer: HiringEntity): URLSearchParams {
  const params = new URLSearchParams()
  params.set("entity_type", employer.entityType)
  params.set("entity_id", employer.entityId)

  if (employer.scope?.eventId) params.set("event_id", employer.scope.eventId)
  if (employer.scope?.tourId) params.set("tour_id", employer.scope.tourId)
  if (employer.scope?.venueId) params.set("venue_id", employer.scope.venueId)

  return params
}

export function getEmployerCacheKey(employer: HiringEntity): string {
  return [
    employer.entityType,
    employer.entityId,
    employer.scope?.eventId || "none",
    employer.scope?.tourId || "none",
    employer.scope?.venueId || "none",
  ].join(":")
}
