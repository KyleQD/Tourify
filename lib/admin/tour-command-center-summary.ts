/**
 * TOUR-203 / REP-201 — Command-center summary BFF / read model.
 *
 * One response: identity, lifecycle, versions, counts, risks, freshness, domain access.
 * REP-201 adds governed contract projection (domainMetrics, degraded states, remediation links).
 * p95 latency target is defined and recorded via tour.summary telemetry.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { normalizeTourLifecycleState } from "@/lib/admin/tour-lifecycle"
import { getTourReadiness } from "@/lib/admin/operations-readiness"
import {
  buildCommandCenterDomainMetric,
  COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
  parseCommandCenterSummaryContract,
  resolveRiskRemediationUrl,
  type CommandCenterDomainMetric,
  type CommandCenterSummaryContract,
} from "@/lib/admin/command-center-summary-contract"
import {
  projectCommandCenterDomainMetrics,
  projectCommandCenterHydrationSlices,
  projectCommandCenterSummaryContract,
} from "@/lib/admin/protected-aggregate-policy"
import {
  buildSignal,
  buildTourHealthSummary,
  type TourHealthSignal,
  type TourHealthSummary,
} from "@/lib/admin/tour-health-aggregation"
import { buildRouteHealthSignals } from "@/lib/admin/tour-route-logistics-health"

/** TOUR-203 — p95 target for GET /api/admin/tours/:id/summary (ms). */
export const TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS = 800

export interface TourCommandCenterDomainAccess {
  overview: boolean
  shows: boolean
  people: boolean
  logistics: boolean
  finance: boolean
  vendors: boolean
  ticketing: boolean
  publications: boolean
  transitions: boolean
}

export interface TourCommandCenterCounts {
  events: number
  /** null when personnel aggregate denied (REP-203 — never fake zero). */
  teamMembers: number | null
  vendors: number
  /** null when finance aggregate denied (REP-203 — never fake zero). */
  financeTransactions: number | null
  logisticsTasks: number
  logisticsCompleted: number
}

export interface TourCommandCenterRisk {
  id: string
  severity: "info" | "warning" | "critical"
  label: string
  domain: string
  /** REP-201 — direct remediation deep link. */
  remediationUrl: string
}

export interface TourCommandCenterSummary {
  /** REP-201 — governed typed contract (also contract-tested). */
  contract: CommandCenterSummaryContract
  identity: {
    id: string
    orgId: string | null
    name: string | null
    slug: string | null
    mainArtist: string | null
    status: string | null
    lifecycleState: string | null
    startDate: string | null
    endDate: string | null
  }
  lifecycle: {
    state: string | null
    lastCommand: string | null
    lastTransitionAt: string | null
    publishedBy: string | null
  }
  versions: {
    metadataVersion: number
    planVersion: number | null
    publishedVersion: number | null
  }
  counts: TourCommandCenterCounts
  /** REP-201 — per-domain counts with ok/denied/unavailable states. */
  domainMetrics: CommandCenterDomainMetric[]
  risks: TourCommandCenterRisk[]
  /** TOUR-301/302 — truthful route/logistics health; unavailable checks remain unknown. */
  health: TourHealthSummary
  freshness: {
    generatedAt: string
    isStale: boolean
    staleReasons: string[]
    p95TargetMs: number
    isDegraded: boolean
  }
  domainAccess: TourCommandCenterDomainAccess
  /** Lightweight tour row for overview forms (not a full fanout). */
  tour: Record<string, unknown>
  events: Record<string, unknown>[]
  stops: Record<string, unknown>[]
  stopsState: "ready" | "empty" | "denied" | "unavailable"
  teamMembers: Record<string, unknown>[]
  vendors: Record<string, unknown>[]
  financeTransactions: Record<string, unknown>[]
}

export function resolveTourCommandCenterDomainAccess(
  capabilities: readonly AdminCapability[],
): TourCommandCenterDomainAccess {
  return {
    overview: hasAdminCapability(capabilities, "tour.view"),
    shows: hasAdminCapability(capabilities, "event.view") || hasAdminCapability(capabilities, "tour.view"),
    people:
      hasAdminCapability(capabilities, "workforce.view")
      || hasAdminCapability(capabilities, "workforce.manage")
      || hasAdminCapability(capabilities, "hiring.manage"),
    logistics: hasAdminCapability(capabilities, "logistics.view"),
    finance: hasAdminCapability(capabilities, "finance.view"),
    vendors: hasAdminCapability(capabilities, "vendor.view"),
    ticketing: hasAdminCapability(capabilities, "ticketing.view"),
    publications: hasAdminCapability(capabilities, "tour.publish") || hasAdminCapability(capabilities, "tour.view"),
    transitions:
      hasAdminCapability(capabilities, "tour.manage")
      || hasAdminCapability(capabilities, "tour.publish")
      || hasAdminCapability(capabilities, "tour.archive")
      || hasAdminCapability(capabilities, "finance.approve"),
  }
}

function readSettings(row: Record<string, unknown>): Record<string, unknown> {
  if (row.settings && typeof row.settings === "object" && !Array.isArray(row.settings))
    return row.settings as Record<string, unknown>
  return {}
}

type SupabaseLike = { from: (table: string) => any }

export async function buildTourCommandCenterSummary(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  /** Preloaded tour row (from getTour / access check). */
  tour: Record<string, unknown>
  /** Optional access class from tour-access service (defaults to capability projection). */
  accessClass?: CommandCenterSummaryContract["access"]["class"]
}): Promise<TourCommandCenterSummary> {
  const domainAccess = resolveTourCommandCenterDomainAccess(args.capabilities)
  const staleReasons: string[] = []
  const settings = readSettings(args.tour)
  const lifecycle =
    settings.lifecycle && typeof settings.lifecycle === "object" && !Array.isArray(settings.lifecycle)
      ? (settings.lifecycle as Record<string, unknown>)
      : {}

  let events: Record<string, unknown>[] = []
  let stops: Record<string, unknown>[] = []
  let teamMembers: Record<string, unknown>[] = []
  let vendors: Record<string, unknown>[] = []
  let financeTransactions: Record<string, unknown>[] = []
  let logisticsTasks: { status?: string }[] = []
  let routeLegs: Array<{
    has_conflict?: boolean
    conflict_codes?: string[] | null
    distance_km?: number | null
    duration_minutes?: number | null
    calculated_at?: string | null
  }> = []

  let eventsError: string | null = null
  let stopsError: string | null = null
  let teamError: string | null = null
  let vendorsError: string | null = null
  let financeError: string | null = null
  let logisticsError: string | null = null
  let routeError: string | null = null

  if (domainAccess.shows) {
    const { data, error } = await args.supabase
      .from("tour_events")
      .select("ordinal, is_primary, advance_status, events_v2:event_id(*)")
      .eq("tour_id", args.tourId)
      .order("ordinal", { ascending: true })
    if (error) {
      eventsError = error.message || "events_unavailable"
      staleReasons.push("events_unavailable")
    } else {
      events = (data ?? []).map((link: Record<string, unknown>) => {
        const ev = (link.events_v2 || {}) as Record<string, unknown>
        return {
          ...ev,
          advance_status: link.advance_status,
          ordinal: link.ordinal,
          is_primary: link.is_primary,
        }
      })
    }
  }

  if (domainAccess.overview) {
    const { data, error } = await args.supabase
      .from("tour_stops")
      .select("id, tour_version_id, event_id, ordinal, name, stop_type, local_date, status, hold_status, is_protected")
      .eq("tour_id", args.tourId)
      .eq("org_id", args.orgId)
      .eq("status", "active")
      .order("ordinal", { ascending: true })
    if (error) {
      stopsError = error.message || "stops_unavailable"
      staleReasons.push("stops_unavailable")
    } else {
      stops = (data ?? []) as Record<string, unknown>[]
    }
  }

  if (domainAccess.people) {
    const { data, error } = await args.supabase
      .from("tour_team_members")
      .select("id, user_id, role, status, is_active, member_name, member_email")
      .eq("tour_id", args.tourId)
      .limit(200)
    if (error) {
      if (error.code !== "42P01") {
        teamError = error.message || "team_unavailable"
        staleReasons.push("team_unavailable")
      }
    } else {
      teamMembers = (data ?? []) as Record<string, unknown>[]
    }
  }

  if (domainAccess.vendors) {
    const { data, error } = await args.supabase
      .from("tour_vendors")
      .select("id, vendor_id, name, category, status, contact_email")
      .eq("tour_id", args.tourId)
      .limit(200)
    if (error) {
      if (error.code !== "42P01") {
        vendorsError = error.message || "vendors_unavailable"
        staleReasons.push("vendors_unavailable")
      }
    } else {
      vendors = (data ?? []) as Record<string, unknown>[]
    }
  }

  if (domainAccess.finance) {
    const { data, error } = await args.supabase
      .from("financial_transactions")
      .select("id, type, category, amount, payment_status, description, updated_at")
      .eq("tour_id", args.tourId)
      .eq("org_id", args.orgId)
      .order("updated_at", { ascending: false })
      .limit(25)
    if (error) {
      if (error.code !== "42P01") {
        financeError = error.message || "finance_unavailable"
        staleReasons.push("finance_unavailable")
      }
    } else {
      financeTransactions = (data ?? []) as Record<string, unknown>[]
    }
  }

  if (domainAccess.logistics) {
    const { data, error } = await args.supabase
      .from("logistics_tasks")
      .select("id, type, status")
      .eq("tour_id", args.tourId)
      .limit(500)
    if (error) {
      if (error.code !== "42P01" && error.code !== "42703") {
        logisticsError = error.message || "logistics_unavailable"
        staleReasons.push("logistics_unavailable")
      }
    } else {
      logisticsTasks = (data ?? []) as { status?: string }[]
    }
  }

  if (domainAccess.logistics) {
    const { data, error } = await args.supabase
      .from("tour_route_legs")
      .select("has_conflict, conflict_codes, distance_km, duration_minutes, calculated_at")
      .eq("tour_id", args.tourId)
      .eq("org_id", args.orgId)
      .order("from_ordinal", { ascending: true })

    if (error) {
      routeError = error.message || "route_health_unavailable"
      staleReasons.push("route_health_unavailable")
    } else {
      routeLegs = (data ?? []) as typeof routeLegs
    }
  }

  const logisticsCompleted = logisticsTasks.filter((row) => row.status === "completed").length
  const healthEvaluatedAt = new Date().toISOString()
  const adminTourPath = `/admin/dashboard/tours/${args.tourId}`
  const unavailableSignal = (args: {
    signalId: string
    label: string
    source: "route" | "logistics"
    remediationUrl: string
    detail: string
  }): TourHealthSignal => buildSignal({
    signal_id: args.signalId,
    label: args.label,
    source: args.source,
    owner: args.source,
    threshold: { type: "count_lte", value: 0 },
    observedValue: null,
    evaluated_at: healthEvaluatedAt,
    remediationUrl: args.remediationUrl,
    detail: args.detail,
  })

  const routeSignals = routeError || !domainAccess.logistics
    ? [
        unavailableSignal({
          signalId: "route.health_unavailable",
          label: "Route health",
          source: "route",
          remediationUrl: `${adminTourPath}?tab=logistics`,
          detail: domainAccess.logistics
            ? "Route health could not be evaluated."
            : "Route health is unavailable for the current role.",
        }),
      ]
    : buildRouteHealthSignals({
        tourId: args.tourId,
        conflictErrorCount: routeLegs.reduce((count, leg) => count + (leg.conflict_codes ?? []).filter(
          (code) => ["same_day_overlap", "insufficient_travel", "missing_location", "impossible_arrival"].includes(code),
        ).length, 0),
        conflictWarningCount: routeLegs.reduce((count, leg) => count + (leg.conflict_codes ?? []).filter(
          (code) => ["insufficient_rest", "excessive_drive", "curfew_conflict", "border_ferry_risk"].includes(code),
        ).length, 0),
        unknownLegCount: routeLegs.filter(
          (leg) => leg.distance_km == null && leg.duration_minutes == null,
        ).length,
        oldestLegCalculatedAt: routeLegs
          .map((leg) => leg.calculated_at)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null,
        evaluatedAt: healthEvaluatedAt,
        adminTourPath,
      })

  // TOUR-302 contracts exist, but canonical logistics coverage rows are not yet
  // persisted. Keep each check explicitly unknown instead of reporting zero.
  const logisticsSignals = [
    ["logistics.missing_segments", "Travel segment coverage", "travel"],
    ["logistics.missing_rooms", "Room night coverage", "lodging"],
    ["logistics.missing_equipment", "Equipment transport coverage", "equipment"],
    ["logistics.unresolved_travelers", "Traveler assignment coverage", "travel"],
    ["logistics.missing_meals", "Crew catering coverage", "catering"],
  ].map(([signalId, label, panel]) => unavailableSignal({
    signalId,
    label,
    source: "logistics",
    remediationUrl: `${adminTourPath}?tab=logistics&panel=${panel}`,
    detail: domainAccess.logistics
      ? "Canonical coverage data is not available yet."
      : "This check is unavailable for the current role.",
  }))
  const health = buildTourHealthSummary({
    tourId: args.tourId,
    signals: [...routeSignals, ...logisticsSignals],
  })
  const readiness = getTourReadiness({
    name: typeof args.tour.name === "string" ? args.tour.name : "",
    main_artist: String(settings.main_artist ?? settings.mainArtist ?? ""),
    artist_account_id:
      typeof args.tour.artist_id === "string"
        ? args.tour.artist_id
        : typeof settings.artist_account_id === "string"
          ? settings.artist_account_id
          : null,
    start_date: typeof args.tour.start_date === "string" ? args.tour.start_date : null,
    end_date: typeof args.tour.end_date === "string" ? args.tour.end_date : null,
    events: (events as Array<Record<string, unknown>>).map((ev) => ({
      id: String(ev.id ?? ""),
      name: (ev.title || ev.name) as string | null,
      date: typeof ev.start_at === "string" ? ev.start_at.slice(0, 10) : (ev.event_date as string | null),
      venue_id: ev.venue_id as string | null,
      venue_name: ev.venue_name as string | null,
    })),
    route: Array.isArray(settings.route) ? settings.route : [],
    budget: args.tour.budget as string | number | null,
  })

  const domainMetrics: CommandCenterDomainMetric[] = [
    buildCommandCenterDomainMetric({
      domain: "shows",
      tourId: args.tourId,
      allowed: domainAccess.shows,
      count: events.length,
      loadError: eventsError,
    }),
    buildCommandCenterDomainMetric({
      domain: "people",
      tourId: args.tourId,
      allowed: domainAccess.people,
      count: teamMembers.length,
      loadError: teamError,
    }),
    buildCommandCenterDomainMetric({
      domain: "vendors",
      tourId: args.tourId,
      allowed: domainAccess.vendors,
      count: vendors.length,
      loadError: vendorsError,
    }),
    buildCommandCenterDomainMetric({
      domain: "finance",
      tourId: args.tourId,
      allowed: domainAccess.finance,
      count: financeTransactions.length,
      loadError: financeError,
    }),
    buildCommandCenterDomainMetric({
      domain: "logistics",
      tourId: args.tourId,
      allowed: domainAccess.logistics,
      count: logisticsTasks.length,
      loadError: logisticsError,
      detail: logisticsError
        ? null
        : `${logisticsCompleted} completed of ${logisticsTasks.length}`,
    }),
    buildCommandCenterDomainMetric({
      domain: "readiness",
      tourId: args.tourId,
      allowed: domainAccess.overview,
      count: readiness.blockers.length,
      loadError: null,
      kpiId: "tour.readiness_blocker_count",
      detail: `${readiness.conflicts.length} warning(s)`,
    }),
    buildCommandCenterDomainMetric({
      domain: "publications",
      tourId: args.tourId,
      allowed: domainAccess.publications,
      count: typeof lifecycle.published_version === "number" || typeof settings.published_version === "number"
        ? 1
        : 0,
      loadError: null,
      kpiId: "tour.unacked_publications",
      detail: "Publication ack lag tracked in REP-202+",
    }),
  ]

  const risks: TourCommandCenterRisk[] = [
    ...readiness.blockers.map((item) => ({
      id: `readiness.${item.id}`,
      severity: "critical" as const,
      label: item.label,
      domain: "readiness",
      remediationUrl: resolveRiskRemediationUrl({
        riskId: `readiness.${item.id}`,
        domain: "readiness",
        tourId: args.tourId,
      }),
    })),
    ...readiness.conflicts.map((conflict) => ({
      id: conflict.id,
      severity: conflict.severity === "critical" ? ("critical" as const) : ("warning" as const),
      label: conflict.label,
      domain: "readiness",
      remediationUrl: resolveRiskRemediationUrl({
        riskId: conflict.id,
        domain: "readiness",
        tourId: args.tourId,
      }),
    })),
  ]

  risks.push(
    ...health.errors.map((signal) => ({
      id: signal.signal_id,
      severity: "critical" as const,
      label: signal.detail || signal.label,
      domain: signal.source,
      remediationUrl: signal.remediationUrl,
    })),
    ...health.warnings.map((signal) => ({
      id: signal.signal_id,
      severity: "warning" as const,
      label: signal.detail || signal.label,
      domain: signal.source,
      remediationUrl: signal.remediationUrl,
    })),
  )

  if (staleReasons.length > 0) {
    risks.push({
      id: "summary.degraded",
      severity: "warning",
      label: "Some command-center domains failed to load",
      domain: "summary",
      remediationUrl: resolveRiskRemediationUrl({
        riskId: "summary.degraded",
        domain: "summary",
        tourId: args.tourId,
      }),
    })
  }

  const lifecycleState = normalizeTourLifecycleState(
    typeof args.tour.status === "string" ? args.tour.status : null,
  )

  const metadataVersion =
    typeof args.tour.metadata_version === "number" ? args.tour.metadata_version : 1
  const planVersion =
    typeof args.tour.plan_version === "number" ? args.tour.plan_version : null
  const publishedVersion =
    typeof lifecycle.published_version === "number"
      ? lifecycle.published_version
      : typeof settings.published_version === "number"
        ? settings.published_version
        : null

  const generatedAt = new Date().toISOString()
  const isDegraded = domainMetrics.some(
    (metric) => metric.state === "unavailable" || metric.state === "partial" || metric.state === "stale",
  ) || health.status === "degraded" || health.status === "unhealthy"

  const identity = {
    id: String(args.tour.id),
    orgId: (args.tour.org_id as string | null) ?? args.orgId,
    name: (args.tour.name as string | null) ?? null,
    slug: (args.tour.slug as string | null) ?? null,
    mainArtist: String(settings.main_artist ?? settings.mainArtist ?? "") || null,
    status: (args.tour.status as string | null) ?? null,
    lifecycleState,
    startDate: (args.tour.start_date as string | null) ?? null,
    endDate: (args.tour.end_date as string | null) ?? null,
  }

  const lifecycleView = {
    state: lifecycleState,
    lastCommand: typeof lifecycle.last_command === "string" ? lifecycle.last_command : null,
    lastTransitionAt:
      typeof lifecycle.last_transition_at === "string" ? lifecycle.last_transition_at : null,
    publishedBy: typeof lifecycle.published_by === "string" ? lifecycle.published_by : null,
  }

  const versions = {
    metadataVersion,
    planVersion,
    publishedVersion,
  }

  const freshness = {
    generatedAt,
    isStale: staleReasons.length > 0,
    staleReasons,
    p95TargetMs: TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS,
    isDegraded,
  }

  const contract = projectCommandCenterSummaryContract({
    contract: parseCommandCenterSummaryContract({
      contractVersion: COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
      identity,
      lifecycle: lifecycleView,
      versions,
      access: {
        class: args.accessClass ?? "capability_projection",
        domains: domainAccess,
      },
      domainMetrics,
      risks,
      freshness,
    }),
    capabilities: args.capabilities,
  })

  const hydration = projectCommandCenterHydrationSlices({
    teamMembers,
    financeTransactions,
    vendors,
    capabilities: args.capabilities,
  })

  // REP-203 — when personnel/finance aggregates are denied, suppress row fanout.
  const peopleMetric = contract.domainMetrics.find((row) => row.domain === "people")
  const financeMetric = contract.domainMetrics.find((row) => row.domain === "finance")
  const safeTeamMembers =
    peopleMetric?.state === "denied" ? [] : hydration.teamMembers
  const safeFinanceTransactions =
    financeMetric?.state === "denied" ? [] : hydration.financeTransactions

  return {
    contract,
    identity,
    lifecycle: lifecycleView,
    versions,
    counts: {
      events: eventsError ? 0 : events.length,
      teamMembers:
        peopleMetric?.state === "denied"
          ? null
          : teamError
            ? 0
            : safeTeamMembers.length,
      vendors: vendorsError ? 0 : hydration.vendors.length,
      financeTransactions:
        financeMetric?.state === "denied"
          ? null
          : financeError
            ? 0
            : safeFinanceTransactions.length,
      logisticsTasks: logisticsError ? 0 : logisticsTasks.length,
      logisticsCompleted,
    },
    domainMetrics: contract.domainMetrics,
    risks,
    health,
    freshness,
    domainAccess,
    tour: args.tour,
    events,
    stops,
    stopsState: !domainAccess.overview
      ? "denied"
      : stopsError
        ? "unavailable"
        : stops.length
          ? "ready"
          : "empty",
    teamMembers: safeTeamMembers,
    vendors: hydration.vendors,
    financeTransactions: safeFinanceTransactions,
  }
}
