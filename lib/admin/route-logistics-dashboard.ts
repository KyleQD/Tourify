/**
 * REP-301 — Route/logistics dashboard metric contract (pure).
 *
 * Uses normalized legs/manifests/rooms/equipment/meals as denominators.
 * Every metric has: id, label, domain, numerator, denominator, unit,
 * completion_pct (null when denominator=0 or data unavailable), severity,
 * freshness_at, is_stale, owner, drilldown_url.
 *
 * Distinct from zero: denied/unavailable/unknown states are never
 * rendered as zero-completion.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Metric types
// ---------------------------------------------------------------------------

export type RepMetricUnit =
  | "count"
  | "percent"
  | "miles"
  | "hours"
  | "count_of_total"

export type RepMetricSeverity = "ok" | "warning" | "error" | "unknown" | "denied"
export type RepMetricState = "ok" | "partial" | "stale" | "unavailable" | "denied"

export interface RouteLogisticsMetric {
  /** Stable KPI catalog ID (e.g. "route.legs_with_provider"). */
  metric_id: string
  label: string
  domain: "route" | "travel" | "lodging" | "equipment" | "catering" | "logistics_tasks"
  /** Number of items satisfying the metric condition. Null = unavailable. */
  numerator: number | null
  /** Total denominator (e.g. total legs). Null = unavailable. */
  denominator: number | null
  /**
   * 0–100 completion percentage. Null when denominator is 0 or data unavailable.
   * Never use this as a proxy for "zero" — check `state` first.
   */
  completion_pct: number | null
  unit: RepMetricUnit
  severity: RepMetricSeverity
  state: RepMetricState
  /** ISO timestamp of the source data used for this metric. */
  freshness_at: string | null
  is_stale: boolean
  /** Team/domain responsible for resolving gaps. */
  owner: string
  /** Deep-link to admin panel for drilling into this metric. */
  drilldown_url: string
}

// ---------------------------------------------------------------------------
// Input data shapes (domain summaries, not raw records)
// ---------------------------------------------------------------------------

export interface RouteLegsSummaryInput {
  tour_id: string
  total_legs: number
  legs_with_provider: number
  legs_with_distance: number
  legs_with_constraint_error: number
  legs_with_constraint_warning: number
  /** ISO of oldest leg recalculation; null if none calculated. */
  oldest_calculated_at: string | null
  freshness_at: string
}

export interface TravelManifestSummaryInput {
  tour_id: string
  total_party_slots: number
  slots_with_segment: number
  slots_confirmed: number
  unresolved_traveler_count: number
  freshness_at: string
}

export interface LodgingSummaryInput {
  tour_id: string
  total_required_room_nights: number
  room_nights_assigned: number
  blocks_confirmed: number
  total_blocks: number
  freshness_at: string
}

export interface EquipmentSummaryInput {
  tour_id: string
  total_required_items: number
  items_with_transport: number
  items_with_custody: number
  unresolved_damage_reports: number
  freshness_at: string
}

export interface CateringSummaryInput {
  tour_id: string
  total_meal_services: number
  meal_services_with_provider: number
  meal_services_approved: number
  unmet_hospitality_requirements: number
  freshness_at: string
}

export interface LogisticsTaskSummaryInput {
  tour_id: string
  total_tasks: number
  tasks_complete: number
  tasks_blocked: number
  tasks_overdue: number
  tasks_with_unresolved_deps: number
  freshness_at: string
}

// ---------------------------------------------------------------------------
// Stale threshold
// ---------------------------------------------------------------------------

/** Default freshness SLO: 60 minutes. */
export const ROUTE_LOGISTICS_STALE_MINUTES = 60

function isStale(freshnessAt: string | null, nowIso: string, maxMinutes = ROUTE_LOGISTICS_STALE_MINUTES): boolean {
  if (!freshnessAt) return true
  const age = (new Date(nowIso).getTime() - new Date(freshnessAt).getTime()) / 60_000
  return age > maxMinutes
}

function completionPct(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null) return null
  if (denominator === 0) return null
  return Math.round((numerator / denominator) * 100)
}

function severityFromPct(
  pct: number | null,
  state: RepMetricState,
  errorThreshold: number,
  warningThreshold: number,
): RepMetricSeverity {
  if (state === "denied") return "denied"
  if (state === "unavailable" || pct === null) return "unknown"
  if (state === "stale") return "warning"
  if (pct < errorThreshold) return "error"
  if (pct < warningThreshold) return "warning"
  return "ok"
}

function metricState(
  numerator: number | null,
  denominator: number | null,
  isStaleFlag: boolean,
  isDenied = false,
): RepMetricState {
  if (isDenied) return "denied"
  if (numerator == null || denominator == null) return "unavailable"
  if (isStaleFlag) return "stale"
  if (denominator === 0) return "ok"   // nothing to complete = ok
  const pct = (numerator / denominator) * 100
  if (pct < 100) return "partial"
  return "ok"
}

function drilldown(tourId: string, tab: string, filter?: string): string {
  const base = `/admin/dashboard/tours/${tourId}?tab=${tab}`
  return filter ? `${base}&filter=${filter}` : base
}

// ---------------------------------------------------------------------------
// Metric builders
// ---------------------------------------------------------------------------

/** REP-301: Route legs metrics. */
export function buildRouteLegMetrics(
  input: RouteLegsSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const providerPct = completionPct(input.legs_with_provider, input.total_legs)
  const providerState = metricState(input.legs_with_provider, input.total_legs, stale)

  const distPct = completionPct(input.legs_with_distance, input.total_legs)
  const distState = metricState(input.legs_with_distance, input.total_legs, stale)

  const errorState: RepMetricState = stale ? "stale" : input.legs_with_constraint_error > 0 ? "partial" : "ok"
  const warnState: RepMetricState = stale ? "stale" : input.legs_with_constraint_warning > 0 ? "partial" : "ok"

  return [
    {
      metric_id: "route.legs_with_provider",
      label: "Route Legs with Provider",
      domain: "route",
      numerator: input.legs_with_provider,
      denominator: input.total_legs,
      completion_pct: providerPct,
      unit: "count_of_total",
      severity: severityFromPct(providerPct, providerState, 50, 90),
      state: providerState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "routing",
      drilldown_url: drilldown(t, "logistics", "route"),
    },
    {
      metric_id: "route.legs_with_distance",
      label: "Route Legs with Distance",
      domain: "route",
      numerator: input.legs_with_distance,
      denominator: input.total_legs,
      completion_pct: distPct,
      unit: "count_of_total",
      severity: severityFromPct(distPct, distState, 50, 80),
      state: distState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "routing",
      drilldown_url: drilldown(t, "logistics", "route_distance"),
    },
    {
      metric_id: "route.constraint_errors",
      label: "Route Constraint Errors",
      domain: "route",
      numerator: input.legs_with_constraint_error,
      denominator: input.total_legs,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.legs_with_constraint_error > 0 ? "error" : "ok",
      state: errorState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "routing",
      drilldown_url: drilldown(t, "logistics", "route_errors"),
    },
    {
      metric_id: "route.constraint_warnings",
      label: "Route Constraint Warnings",
      domain: "route",
      numerator: input.legs_with_constraint_warning,
      denominator: input.total_legs,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.legs_with_constraint_warning > 0 ? "warning" : "ok",
      state: warnState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "routing",
      drilldown_url: drilldown(t, "logistics", "route_warnings"),
    },
  ]
}

/** REP-301: Travel/party manifest metrics. */
export function buildTravelManifestMetrics(
  input: TravelManifestSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const segPct = completionPct(input.slots_with_segment, input.total_party_slots)
  const segState = metricState(input.slots_with_segment, input.total_party_slots, stale)

  const confPct = completionPct(input.slots_confirmed, input.total_party_slots)
  const confState = metricState(input.slots_confirmed, input.total_party_slots, stale)

  return [
    {
      metric_id: "travel.party_segment_coverage",
      label: "Party Segment Coverage",
      domain: "travel",
      numerator: input.slots_with_segment,
      denominator: input.total_party_slots,
      completion_pct: segPct,
      unit: "count_of_total",
      severity: severityFromPct(segPct, segState, 60, 90),
      state: segState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "travel",
      drilldown_url: drilldown(t, "logistics", "travel_segments"),
    },
    {
      metric_id: "travel.party_confirmed",
      label: "Party Travel Confirmed",
      domain: "travel",
      numerator: input.slots_confirmed,
      denominator: input.total_party_slots,
      completion_pct: confPct,
      unit: "count_of_total",
      severity: severityFromPct(confPct, confState, 50, 80),
      state: confState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "travel",
      drilldown_url: drilldown(t, "logistics", "travel_confirmed"),
    },
    {
      metric_id: "travel.unresolved_travelers",
      label: "Unresolved Travelers",
      domain: "travel",
      numerator: input.unresolved_traveler_count,
      denominator: input.total_party_slots,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.unresolved_traveler_count > 0 ? "error" : "ok",
      state: stale ? "stale" : input.unresolved_traveler_count > 0 ? "partial" : "ok",
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "travel",
      drilldown_url: drilldown(t, "logistics", "unresolved_travelers"),
    },
  ]
}

/** REP-301: Lodging metrics. */
export function buildLodgingMetrics(
  input: LodgingSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const assignPct = completionPct(input.room_nights_assigned, input.total_required_room_nights)
  const assignState = metricState(input.room_nights_assigned, input.total_required_room_nights, stale)

  const blockConfPct = completionPct(input.blocks_confirmed, input.total_blocks)
  const blockConfState = metricState(input.blocks_confirmed, input.total_blocks, stale)

  return [
    {
      metric_id: "lodging.room_nights_assigned",
      label: "Room Nights Assigned",
      domain: "lodging",
      numerator: input.room_nights_assigned,
      denominator: input.total_required_room_nights,
      completion_pct: assignPct,
      unit: "count_of_total",
      severity: severityFromPct(assignPct, assignState, 60, 90),
      state: assignState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "travel",
      drilldown_url: drilldown(t, "logistics", "lodging"),
    },
    {
      metric_id: "lodging.blocks_confirmed",
      label: "Lodging Blocks Confirmed",
      domain: "lodging",
      numerator: input.blocks_confirmed,
      denominator: input.total_blocks,
      completion_pct: blockConfPct,
      unit: "count_of_total",
      severity: severityFromPct(blockConfPct, blockConfState, 50, 80),
      state: blockConfState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "travel",
      drilldown_url: drilldown(t, "logistics", "lodging_blocks"),
    },
  ]
}

/** REP-301: Equipment metrics. */
export function buildEquipmentMetrics(
  input: EquipmentSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const transPct = completionPct(input.items_with_transport, input.total_required_items)
  const transState = metricState(input.items_with_transport, input.total_required_items, stale)

  const custPct = completionPct(input.items_with_custody, input.total_required_items)
  const custState = metricState(input.items_with_custody, input.total_required_items, stale)

  return [
    {
      metric_id: "equipment.items_with_transport",
      label: "Equipment Items with Transport",
      domain: "equipment",
      numerator: input.items_with_transport,
      denominator: input.total_required_items,
      completion_pct: transPct,
      unit: "count_of_total",
      severity: severityFromPct(transPct, transState, 70, 95),
      state: transState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "equipment_transport"),
    },
    {
      metric_id: "equipment.items_with_custody",
      label: "Equipment Items with Custody Record",
      domain: "equipment",
      numerator: input.items_with_custody,
      denominator: input.total_required_items,
      completion_pct: custPct,
      unit: "count_of_total",
      severity: severityFromPct(custPct, custState, 50, 80),
      state: custState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "equipment_custody"),
    },
    {
      metric_id: "equipment.unresolved_damage_reports",
      label: "Unresolved Damage/Loss Reports",
      domain: "equipment",
      numerator: input.unresolved_damage_reports,
      denominator: input.total_required_items,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.unresolved_damage_reports > 0 ? "error" : "ok",
      state: stale ? "stale" : input.unresolved_damage_reports > 0 ? "partial" : "ok",
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "equipment_damage"),
    },
  ]
}

/** REP-301: Catering/hospitality metrics. */
export function buildCateringMetrics(
  input: CateringSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const provPct = completionPct(input.meal_services_with_provider, input.total_meal_services)
  const provState = metricState(input.meal_services_with_provider, input.total_meal_services, stale)

  const appPct = completionPct(input.meal_services_approved, input.total_meal_services)
  const appState = metricState(input.meal_services_approved, input.total_meal_services, stale)

  return [
    {
      metric_id: "catering.meal_services_with_provider",
      label: "Meal Services with Provider",
      domain: "catering",
      numerator: input.meal_services_with_provider,
      denominator: input.total_meal_services,
      completion_pct: provPct,
      unit: "count_of_total",
      severity: severityFromPct(provPct, provState, 60, 90),
      state: provState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "catering",
      drilldown_url: drilldown(t, "logistics", "catering"),
    },
    {
      metric_id: "catering.meal_services_approved",
      label: "Meal Services Approved",
      domain: "catering",
      numerator: input.meal_services_approved,
      denominator: input.total_meal_services,
      completion_pct: appPct,
      unit: "count_of_total",
      severity: severityFromPct(appPct, appState, 50, 80),
      state: appState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "catering",
      drilldown_url: drilldown(t, "logistics", "catering_approved"),
    },
    {
      metric_id: "catering.unmet_hospitality_requirements",
      label: "Unmet Hospitality Requirements",
      domain: "catering",
      numerator: input.unmet_hospitality_requirements,
      denominator: null,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.unmet_hospitality_requirements > 0 ? "warning" : "ok",
      state: stale ? "stale" : input.unmet_hospitality_requirements > 0 ? "partial" : "ok",
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "catering",
      drilldown_url: drilldown(t, "logistics", "hospitality"),
    },
  ]
}

/** REP-301: Logistics task metrics. */
export function buildLogisticsTaskMetrics(
  input: LogisticsTaskSummaryInput,
  nowIso: string,
): RouteLogisticsMetric[] {
  const stale = isStale(input.freshness_at, nowIso)
  const t = input.tour_id

  const compPct = completionPct(input.tasks_complete, input.total_tasks)
  const compState = metricState(input.tasks_complete, input.total_tasks, stale)

  return [
    {
      metric_id: "logistics_tasks.completion",
      label: "Logistics Task Completion",
      domain: "logistics_tasks",
      numerator: input.tasks_complete,
      denominator: input.total_tasks,
      completion_pct: compPct,
      unit: "count_of_total",
      severity: severityFromPct(compPct, compState, 50, 80),
      state: compState,
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "tasks"),
    },
    {
      metric_id: "logistics_tasks.blocked",
      label: "Blocked Logistics Tasks",
      domain: "logistics_tasks",
      numerator: input.tasks_blocked,
      denominator: input.total_tasks,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.tasks_blocked > 0 ? "warning" : "ok",
      state: stale ? "stale" : input.tasks_blocked > 0 ? "partial" : "ok",
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "tasks_blocked"),
    },
    {
      metric_id: "logistics_tasks.overdue",
      label: "Overdue Logistics Tasks",
      domain: "logistics_tasks",
      numerator: input.tasks_overdue,
      denominator: input.total_tasks,
      completion_pct: null,
      unit: "count",
      severity: stale ? "warning" : input.tasks_overdue > 0 ? "error" : "ok",
      state: stale ? "stale" : input.tasks_overdue > 0 ? "partial" : "ok",
      freshness_at: input.freshness_at,
      is_stale: stale,
      owner: "logistics",
      drilldown_url: drilldown(t, "logistics", "tasks_overdue"),
    },
  ]
}

// ---------------------------------------------------------------------------
// Aggregated dashboard
// ---------------------------------------------------------------------------

export interface RouteLogisticsDashboard {
  tour_id: string
  generated_at: string
  /** Overall dashboard state: worst of all domain states. */
  overall_state: RepMetricState
  metrics: RouteLogisticsMetric[]
  /** Metrics in error state — call-to-action list. */
  critical_metrics: RouteLogisticsMetric[]
}

const STATE_RANK: Record<RepMetricState, number> = {
  denied:      5,
  unavailable: 4,
  stale:       3,
  partial:     2,
  ok:          1,
}

function worstState(states: RepMetricState[]): RepMetricState {
  if (states.length === 0) return "ok"
  return states.reduce((a, b) => (STATE_RANK[a] >= STATE_RANK[b] ? a : b))
}

export function buildRouteLogisticsDashboard(args: {
  tourId: string
  route: RouteLegsSummaryInput
  travel: TravelManifestSummaryInput
  lodging: LodgingSummaryInput
  equipment: EquipmentSummaryInput
  catering: CateringSummaryInput
  tasks: LogisticsTaskSummaryInput
  nowIso: string
}): RouteLogisticsDashboard {
  const { tourId, route, travel, lodging, equipment, catering, tasks, nowIso } = args

  const metrics: RouteLogisticsMetric[] = [
    ...buildRouteLegMetrics(route, nowIso),
    ...buildTravelManifestMetrics(travel, nowIso),
    ...buildLodgingMetrics(lodging, nowIso),
    ...buildEquipmentMetrics(equipment, nowIso),
    ...buildCateringMetrics(catering, nowIso),
    ...buildLogisticsTaskMetrics(tasks, nowIso),
  ]

  const overall_state = worstState(metrics.map((m) => m.state))
  const critical_metrics = metrics.filter(
    (m) => m.severity === "error" || m.severity === "unknown" || m.state === "unavailable",
  )

  return {
    tour_id: tourId,
    generated_at: nowIso,
    overall_state,
    metrics,
    critical_metrics,
  }
}
