/**
 * Shared Admin readiness contract (ADR-006 / PLAN-003 / EVENT-201 / REL-005).
 * UI, server publish checks, and tests must use these rule IDs and severities.
 */

export type ReadinessSeverity = "blocker" | "warning"

export type ReadinessOverridePolicy = "none" | "capability_warning" | "forbidden"

export interface ReadinessRuleContract {
  id: string
  severity: ReadinessSeverity
  remediation: string
  /** Deep-link path template; `{eventId}` / `{tourId}` substituted by engines. */
  remediationPath: string
  overridePolicy: ReadinessOverridePolicy
  domain: "event" | "tour"
}

/** Default publish contract for organization tours/events. */
export const ADMIN_READINESS_RULES = {
  event_basics: {
    id: "basics",
    severity: "blocker",
    remediation: "Add an event title before publish.",
    remediationPath: "/admin/dashboard/events/{eventId}",
    overridePolicy: "forbidden",
    domain: "event",
  },
  event_schedule: {
    id: "schedule",
    severity: "blocker",
    remediation: "Set a show date/start time before publish.",
    remediationPath: "/admin/dashboard/events/{eventId}",
    overridePolicy: "forbidden",
    domain: "event",
  },
  event_venue_identity: {
    id: "venue",
    severity: "blocker",
    remediation: "Provide a venue name, venue id, or venue profile before publish.",
    remediationPath: "/admin/dashboard/events/{eventId}",
    overridePolicy: "forbidden",
    domain: "event",
  },
  event_venue_profile: {
    id: "venue_profile",
    severity: "warning",
    remediation: "Attach a venue profile so advancing and hiring resolve to a real account.",
    remediationPath: "/admin/dashboard/events/{eventId}",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_staffing: {
    id: "team",
    severity: "warning",
    remediation: "Assign staff for day-of coverage (org policy may elevate to blocker later).",
    remediationPath: "/admin/dashboard/events/{eventId}?tab=people",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_tour_assignment: {
    id: "tour_assignment",
    severity: "warning",
    remediation: "Choose a primary tour when multiple tours are linked.",
    remediationPath: "/admin/dashboard/events/{eventId}",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_advancing: {
    id: "advancing",
    severity: "warning",
    remediation: "Start advancing so venue contacts and production notes are shared.",
    remediationPath: "/admin/dashboard/events/{eventId}/advancing",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_logistics: {
    id: "logistics",
    severity: "warning",
    remediation: "Stage travel, lodging, equipment, and site maps for operations.",
    remediationPath: "/admin/dashboard/events/{eventId}?tab=logistics",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_finance: {
    id: "finance",
    severity: "warning",
    remediation: "Add ticket price, revenue, expenses, or settlement notes.",
    remediationPath: "/admin/dashboard/events/{eventId}?tab=tickets",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_day_sheet: {
    id: "day_sheet",
    severity: "warning",
    remediation: "Complete day-sheet notes once schedule and venue are set.",
    remediationPath: "/admin/dashboard/events/{eventId}/day-sheet",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  event_communications: {
    id: "communications",
    severity: "warning",
    remediation: "Open the event communications hub for producer handoff.",
    remediationPath: "/admin/dashboard/events/{eventId}?tab=comms",
    overridePolicy: "capability_warning",
    domain: "event",
  },
  tour_overview: {
    id: "overview",
    severity: "blocker",
    remediation: "Set tour name and headliner label or artist account.",
    remediationPath: "/admin/dashboard/tours/{tourId}",
    overridePolicy: "forbidden",
    domain: "tour",
  },
  tour_dates: {
    id: "dates",
    severity: "blocker",
    remediation: "Set tour start and end dates.",
    remediationPath: "/admin/dashboard/tours/{tourId}",
    overridePolicy: "forbidden",
    domain: "tour",
  },
  tour_stops: {
    id: "events",
    severity: "blocker",
    remediation: "Add at least one confirmed show stop with name, date, and venue.",
    remediationPath: "/admin/dashboard/tours/{tourId}",
    overridePolicy: "forbidden",
    domain: "tour",
  },
} as const satisfies Record<string, ReadinessRuleContract>

export type AdminReadinessRuleKey = keyof typeof ADMIN_READINESS_RULES

export function listEventReadinessRules(): ReadinessRuleContract[] {
  return Object.values(ADMIN_READINESS_RULES).filter((rule) => rule.domain === "event")
}

export function getAdminReadinessRuleById(ruleId: string): ReadinessRuleContract | undefined {
  return Object.values(ADMIN_READINESS_RULES).find((rule) => rule.id === ruleId)
}

export function isDefaultPublishBlocker(ruleId: string): boolean {
  return Object.values(ADMIN_READINESS_RULES).some(
    (rule) => rule.id === ruleId && rule.severity === "blocker",
  )
}

export function resolveReadinessRemediationUrl(
  pathTemplate: string,
  ids: { eventId?: string | null; tourId?: string | null },
): string {
  return pathTemplate
    .replace("{eventId}", ids.eventId?.trim() || "new")
    .replace("{tourId}", ids.tourId?.trim() || "new")
}
