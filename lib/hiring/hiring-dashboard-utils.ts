import type { HiringEntity } from "@/types/hiring-entity"

/**
 * Optional venue filter for scheduling. Venue employers default to their entity id;
 * org/artist employers only have a venue when scoped via URL or event context.
 * Venue is not required to load or create shifts.
 */
export function resolveSchedulingVenueId(employer: HiringEntity): string | null {
  if (employer.entityType === "venue") return employer.entityId
  return employer.scope?.venueId ?? null
}

/** Live-mode gate flags. Employer is required; venue is optional. */
export function getLiveSchedulingScopeFlags(args: {
  mode: "demo" | "live"
  employer: HiringEntity | null
  venueId: string | null
}): { needsEmployer: boolean; needsVenue: boolean } {
  const isLive = args.mode === "live"
  return {
    needsEmployer: isLive && !args.employer,
    needsVenue: false,
  }
}

export function getEmployerQueryString(employer: HiringEntity): string {
  const params = new URLSearchParams()
  params.set("entity_type", employer.entityType)
  params.set("entity_id", employer.entityId)

  if (employer.scope?.eventId) params.set("event_id", employer.scope.eventId)
  if (employer.scope?.tourId) params.set("tour_id", employer.scope.tourId)
  if (employer.scope?.venueId) params.set("venue_id", employer.scope.venueId)

  return params.toString()
}

export function getEmployerLabel(employer: HiringEntity): string {
  const entityLabel = employer.entityType.charAt(0).toUpperCase() + employer.entityType.slice(1)
  return `${entityLabel}: ${employer.displayName}`
}

export function normalizeStatusLabel(status?: string | null): string {
  if (!status) return "Unknown"

  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function formatDashboardDate(value?: string | null): string {
  if (!value) return "Not set"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function getProgressPercent(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
}
