/**
 * PLAN-206 — Server readiness engine over persisted normalized plan data.
 * Rules return stable IDs, severity, scope, evidence, remediation URL, override policy.
 */

import { ADMIN_READINESS_RULES, type ReadinessSeverity } from "@/lib/admin/readiness-contract"

export type ReadinessScope = "tour" | "stop" | "event"

export type ReadinessOverridePolicy = "none" | "capability_warning" | "forbidden"

export interface PersistedTourPlanStop {
  id?: string
  ordinal: number
  stop_type: string
  name: string
  local_date?: string | null
  venue_label?: string | null
  venue_id?: string | null
  event_id?: string | null
  planning_status?: string | null
  timezone?: string | null
}

export interface PersistedTourPlanInput {
  tourId: string
  orgId: string
  name: string
  mainArtist?: string | null
  artistAccountId?: string | null
  startDate?: string | null
  endDate?: string | null
  stops: PersistedTourPlanStop[]
}

export interface TourReadinessFinding {
  id: string
  severity: ReadinessSeverity
  scope: ReadinessScope
  scopeId: string
  message: string
  evidence: Record<string, unknown>
  remediationUrl: string
  overridePolicy: ReadinessOverridePolicy
}

export interface TourReadinessEvaluation {
  tourId: string
  orgId: string
  ok: boolean
  blockers: TourReadinessFinding[]
  warnings: TourReadinessFinding[]
  findings: TourReadinessFinding[]
  evaluatedAt: string
  source: "persisted_plan"
}

function finding(args: {
  ruleId: string
  severity: ReadinessSeverity
  scope: ReadinessScope
  scopeId: string
  message: string
  evidence: Record<string, unknown>
  remediationPath: string
  overridePolicy: ReadinessOverridePolicy
}): TourReadinessFinding {
  return {
    id: args.ruleId,
    severity: args.severity,
    scope: args.scope,
    scopeId: args.scopeId,
    message: args.message,
    evidence: args.evidence,
    remediationUrl: args.remediationPath,
    overridePolicy: args.overridePolicy,
  }
}

/**
 * Pure evaluation against persisted normalized stops (no I/O).
 */
export function evaluatePersistedTourReadiness(
  input: PersistedTourPlanInput,
): TourReadinessEvaluation {
  const findings: TourReadinessFinding[] = []
  const tourPath = `/admin/dashboard/tours/${input.tourId}`

  const overview = ADMIN_READINESS_RULES.tour_overview
  if (!input.name.trim() || !(input.mainArtist?.trim() || input.artistAccountId)) {
    findings.push(
      finding({
        ruleId: overview.id,
        severity: overview.severity,
        scope: "tour",
        scopeId: input.tourId,
        message: overview.remediation,
        evidence: {
          hasName: Boolean(input.name.trim()),
          hasArtistLabel: Boolean(input.mainArtist?.trim()),
          hasArtistAccount: Boolean(input.artistAccountId),
        },
        remediationPath: `${tourPath}?section=overview`,
        overridePolicy: "forbidden",
      }),
    )
  }

  const dates = ADMIN_READINESS_RULES.tour_dates
  if (!input.startDate || !input.endDate) {
    findings.push(
      finding({
        ruleId: dates.id,
        severity: dates.severity,
        scope: "tour",
        scopeId: input.tourId,
        message: dates.remediation,
        evidence: { startDate: input.startDate ?? null, endDate: input.endDate ?? null },
        remediationPath: `${tourPath}?section=overview`,
        overridePolicy: "forbidden",
      }),
    )
  }

  const showStops = input.stops.filter(
    (stop) =>
      stop.stop_type === "show"
      || stop.stop_type === "festival"
      || stop.stop_type === "rehearsal"
      || stop.stop_type === "promo",
  )
  const confirmedShows = showStops.filter(
    (stop) =>
      Boolean(stop.name?.trim())
      && Boolean(stop.local_date)
      && Boolean(stop.venue_label?.trim() || stop.venue_id),
  )

  const stopsRule = ADMIN_READINESS_RULES.tour_stops
  if (confirmedShows.length === 0) {
    findings.push(
      finding({
        ruleId: stopsRule.id,
        severity: stopsRule.severity,
        scope: "tour",
        scopeId: input.tourId,
        message: stopsRule.remediation,
        evidence: {
          stopCount: input.stops.length,
          showStopCount: showStops.length,
          confirmedShowCount: confirmedShows.length,
        },
        remediationPath: `${tourPath}?section=route`,
        overridePolicy: "forbidden",
      }),
    )
  }

  for (const stop of showStops) {
    const stopId = stop.id || `ordinal:${stop.ordinal}`
    if (!stop.venue_id && stop.venue_label?.trim()) {
      const venueProfile = ADMIN_READINESS_RULES.event_venue_profile
      findings.push(
        finding({
          ruleId: venueProfile.id,
          severity: venueProfile.severity,
          scope: "stop",
          scopeId: stopId,
          message: venueProfile.remediation,
          evidence: {
            stopName: stop.name,
            venueLabel: stop.venue_label,
            venueId: null,
          },
          remediationPath: `${tourPath}?section=route&stop=${encodeURIComponent(stopId)}`,
          overridePolicy: "capability_warning",
        }),
      )
    }
    if (!stop.timezone) {
      findings.push(
        finding({
          ruleId: "timezone",
          severity: "warning",
          scope: "stop",
          scopeId: stopId,
          message: "Set a local time zone for this stop to avoid DST ambiguity.",
          evidence: { stopName: stop.name, local_date: stop.local_date ?? null },
          remediationPath: `${tourPath}?section=route&stop=${encodeURIComponent(stopId)}`,
          overridePolicy: "capability_warning",
        }),
      )
    }
  }

  const blockers = findings.filter((row) => row.severity === "blocker")
  const warnings = findings.filter((row) => row.severity === "warning")

  return {
    tourId: input.tourId,
    orgId: input.orgId,
    ok: blockers.length === 0,
    blockers,
    warnings,
    findings,
    evaluatedAt: new Date().toISOString(),
    source: "persisted_plan",
  }
}

/** PUB-201 — warning overrides must cite finding ids and capability. */
export function applyReadinessWarningOverrides(args: {
  evaluation: TourReadinessEvaluation
  overrideFindingIds: readonly string[]
  hasOverrideCapability: boolean
}): {
  evaluation: TourReadinessEvaluation
  rejectedOverrides: string[]
  appliedOverrides: string[]
} {
  const rejectedOverrides: string[] = []
  const appliedOverrides: string[] = []

  if (!args.hasOverrideCapability && args.overrideFindingIds.length > 0) {
    return {
      evaluation: args.evaluation,
      rejectedOverrides: [...args.overrideFindingIds],
      appliedOverrides: [],
    }
  }

  const overrideSet = new Set(args.overrideFindingIds)
  const remainingWarnings: TourReadinessFinding[] = []
  for (const warning of args.evaluation.warnings) {
    if (overrideSet.has(warning.id) && warning.overridePolicy === "capability_warning") {
      appliedOverrides.push(warning.id)
      continue
    }
    if (overrideSet.has(warning.id)) rejectedOverrides.push(warning.id)
    remainingWarnings.push(warning)
  }

  const findings = [...args.evaluation.blockers, ...remainingWarnings]
  return {
    evaluation: {
      ...args.evaluation,
      warnings: remainingWarnings,
      findings,
      ok: args.evaluation.blockers.length === 0,
    },
    rejectedOverrides,
    appliedOverrides,
  }
}
