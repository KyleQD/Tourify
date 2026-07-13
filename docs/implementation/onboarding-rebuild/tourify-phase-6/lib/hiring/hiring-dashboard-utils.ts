import type { HiringEntity } from "@/types/hiring-entity"

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
