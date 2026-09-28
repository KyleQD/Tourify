/**
 * REP-301 — Route/logistics dashboard metric contract tests.
 */

import { describe, it, expect } from "vitest"
import {
  buildRouteLegMetrics,
  buildTravelManifestMetrics,
  buildLodgingMetrics,
  buildEquipmentMetrics,
  buildCateringMetrics,
  buildLogisticsTaskMetrics,
  buildRouteLogisticsDashboard,
  ROUTE_LOGISTICS_STALE_MINUTES,
  type RouteLegsSummaryInput,
  type TravelManifestSummaryInput,
  type LodgingSummaryInput,
  type EquipmentSummaryInput,
  type CateringSummaryInput,
  type LogisticsTaskSummaryInput,
} from "@/lib/admin/route-logistics-dashboard"

const NOW = "2026-08-20T10:00:00.000Z"
const TOUR = "tour-1"

/** Fresh timestamp = 30 min ago, well within SLO. */
const FRESH = new Date(Date.parse(NOW) - 30 * 60_000).toISOString()
/** Stale timestamp = 90 min ago, past 60-min SLO. */
const STALE = new Date(Date.parse(NOW) - 90 * 60_000).toISOString()

// ---------------------------------------------------------------------------
// Shared input factories
// ---------------------------------------------------------------------------

const makeRoute = (o: Partial<RouteLegsSummaryInput> = {}): RouteLegsSummaryInput => ({
  tour_id: TOUR,
  total_legs: 10,
  legs_with_provider: 8,
  legs_with_distance: 7,
  legs_with_constraint_error: 0,
  legs_with_constraint_warning: 0,
  oldest_calculated_at: FRESH,
  freshness_at: FRESH,
  ...o,
})

const makeTravel = (o: Partial<TravelManifestSummaryInput> = {}): TravelManifestSummaryInput => ({
  tour_id: TOUR,
  total_party_slots: 20,
  slots_with_segment: 18,
  slots_confirmed: 15,
  unresolved_traveler_count: 0,
  freshness_at: FRESH,
  ...o,
})

const makeLodging = (o: Partial<LodgingSummaryInput> = {}): LodgingSummaryInput => ({
  tour_id: TOUR,
  total_required_room_nights: 40,
  room_nights_assigned: 36,
  blocks_confirmed: 3,
  total_blocks: 4,
  freshness_at: FRESH,
  ...o,
})

const makeEquipment = (o: Partial<EquipmentSummaryInput> = {}): EquipmentSummaryInput => ({
  tour_id: TOUR,
  total_required_items: 50,
  items_with_transport: 48,
  items_with_custody: 40,
  unresolved_damage_reports: 0,
  freshness_at: FRESH,
  ...o,
})

const makeCatering = (o: Partial<CateringSummaryInput> = {}): CateringSummaryInput => ({
  tour_id: TOUR,
  total_meal_services: 12,
  meal_services_with_provider: 10,
  meal_services_approved: 8,
  unmet_hospitality_requirements: 0,
  freshness_at: FRESH,
  ...o,
})

const makeTasks = (o: Partial<LogisticsTaskSummaryInput> = {}): LogisticsTaskSummaryInput => ({
  tour_id: TOUR,
  total_tasks: 30,
  tasks_complete: 25,
  tasks_blocked: 0,
  tasks_overdue: 0,
  tasks_with_unresolved_deps: 0,
  freshness_at: FRESH,
  ...o,
})

// ---------------------------------------------------------------------------
// REP-301: Metric structure invariants
// ---------------------------------------------------------------------------

describe("REP-301 — metric structure invariants", () => {
  it("all metrics have stable metric_id, label, domain, owner, drilldown_url", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute(),
      travel: makeTravel(),
      lodging: makeLodging(),
      equipment: makeEquipment(),
      catering: makeCatering(),
      tasks: makeTasks(),
      nowIso: NOW,
    })
    for (const m of dashboard.metrics) {
      expect(m.metric_id.length).toBeGreaterThan(0)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.owner.length).toBeGreaterThan(0)
      expect(m.drilldown_url).toContain(TOUR)
    }
  })

  it("produces 18 metrics total (4 route + 3 travel + 2 lodging + 3 equipment + 3 catering + 3 tasks)", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute(),
      travel: makeTravel(),
      lodging: makeLodging(),
      equipment: makeEquipment(),
      catering: makeCatering(),
      tasks: makeTasks(),
      nowIso: NOW,
    })
    expect(dashboard.metrics).toHaveLength(18)
  })

  it("completion_pct is null when denominator is 0", () => {
    const metrics = buildRouteLegMetrics(makeRoute({ total_legs: 0, legs_with_provider: 0, legs_with_distance: 0 }), NOW)
    const prov = metrics.find((m) => m.metric_id === "route.legs_with_provider")
    expect(prov?.completion_pct).toBeNull()
  })

  it("completion_pct is in range [0, 100] when denominator > 0", () => {
    const metrics = buildRouteLegMetrics(makeRoute(), NOW)
    for (const m of metrics) {
      if (m.completion_pct !== null) {
        expect(m.completion_pct).toBeGreaterThanOrEqual(0)
        expect(m.completion_pct).toBeLessThanOrEqual(100)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// REP-301: Route leg metrics
// ---------------------------------------------------------------------------

describe("REP-301 — route leg metrics", () => {
  it("produces 4 metrics with correct metric IDs", () => {
    const metrics = buildRouteLegMetrics(makeRoute(), NOW)
    expect(metrics).toHaveLength(4)
    const ids = metrics.map((m) => m.metric_id)
    expect(ids).toContain("route.legs_with_provider")
    expect(ids).toContain("route.legs_with_distance")
    expect(ids).toContain("route.constraint_errors")
    expect(ids).toContain("route.constraint_warnings")
  })

  it("ok severity when all legs have provider and no errors", () => {
    const metrics = buildRouteLegMetrics(
      makeRoute({ total_legs: 5, legs_with_provider: 5, legs_with_constraint_error: 0 }),
      NOW,
    )
    const prov = metrics.find((m) => m.metric_id === "route.legs_with_provider")
    expect(prov?.severity).toBe("ok")
    expect(prov?.completion_pct).toBe(100)
  })

  it("error severity when constraint errors > 0", () => {
    const metrics = buildRouteLegMetrics(
      makeRoute({ legs_with_constraint_error: 2 }),
      NOW,
    )
    const err = metrics.find((m) => m.metric_id === "route.constraint_errors")
    expect(err?.severity).toBe("error")
    expect(err?.numerator).toBe(2)
  })

  it("warning severity when constraint warnings > 0", () => {
    const metrics = buildRouteLegMetrics(
      makeRoute({ legs_with_constraint_warning: 1 }),
      NOW,
    )
    const warn = metrics.find((m) => m.metric_id === "route.constraint_warnings")
    expect(warn?.severity).toBe("warning")
  })

  it("marks stale and is_stale=true when freshness past SLO", () => {
    const metrics = buildRouteLegMetrics(makeRoute({ freshness_at: STALE }), NOW)
    for (const m of metrics) {
      expect(m.is_stale).toBe(true)
      expect(m.state).toBe("stale")
    }
  })

  it("stale_minutes default is 60", () => {
    expect(ROUTE_LOGISTICS_STALE_MINUTES).toBe(60)
  })

  it("drilldown_url contains tour_id", () => {
    const metrics = buildRouteLegMetrics(makeRoute(), NOW)
    for (const m of metrics) {
      expect(m.drilldown_url).toContain(TOUR)
    }
  })
})

// ---------------------------------------------------------------------------
// REP-301: Travel/party metrics
// ---------------------------------------------------------------------------

describe("REP-301 — travel manifest metrics", () => {
  it("produces 3 metrics", () => {
    expect(buildTravelManifestMetrics(makeTravel(), NOW)).toHaveLength(3)
  })

  it("unresolved_travelers > 0 → error severity", () => {
    const metrics = buildTravelManifestMetrics(
      makeTravel({ unresolved_traveler_count: 3 }),
      NOW,
    )
    const unresolved = metrics.find((m) => m.metric_id === "travel.unresolved_travelers")
    expect(unresolved?.severity).toBe("error")
    expect(unresolved?.numerator).toBe(3)
  })

  it("unresolved_travelers = 0 → ok severity", () => {
    const metrics = buildTravelManifestMetrics(makeTravel(), NOW)
    const unresolved = metrics.find((m) => m.metric_id === "travel.unresolved_travelers")
    expect(unresolved?.severity).toBe("ok")
  })

  it("100% segment coverage → ok state", () => {
    const metrics = buildTravelManifestMetrics(
      makeTravel({ total_party_slots: 10, slots_with_segment: 10 }),
      NOW,
    )
    const cov = metrics.find((m) => m.metric_id === "travel.party_segment_coverage")
    expect(cov?.state).toBe("ok")
    expect(cov?.completion_pct).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// REP-301: Lodging metrics
// ---------------------------------------------------------------------------

describe("REP-301 — lodging metrics", () => {
  it("produces 2 metrics", () => {
    expect(buildLodgingMetrics(makeLodging(), NOW)).toHaveLength(2)
  })

  it("room_nights fully assigned → 100% completion", () => {
    const metrics = buildLodgingMetrics(
      makeLodging({ total_required_room_nights: 10, room_nights_assigned: 10 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "lodging.room_nights_assigned")
    expect(m?.completion_pct).toBe(100)
    expect(m?.severity).toBe("ok")
  })

  it("blocks_confirmed < total_blocks → partial state", () => {
    const metrics = buildLodgingMetrics(
      makeLodging({ blocks_confirmed: 1, total_blocks: 4 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "lodging.blocks_confirmed")
    expect(m?.state).toBe("partial")
  })
})

// ---------------------------------------------------------------------------
// REP-301: Equipment metrics
// ---------------------------------------------------------------------------

describe("REP-301 — equipment metrics", () => {
  it("produces 3 metrics", () => {
    expect(buildEquipmentMetrics(makeEquipment(), NOW)).toHaveLength(3)
  })

  it("unresolved_damage_reports > 0 → error severity", () => {
    const metrics = buildEquipmentMetrics(
      makeEquipment({ unresolved_damage_reports: 1 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "equipment.unresolved_damage_reports")
    expect(m?.severity).toBe("error")
  })

  it("all items with transport → 100%", () => {
    const metrics = buildEquipmentMetrics(
      makeEquipment({ total_required_items: 20, items_with_transport: 20 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "equipment.items_with_transport")
    expect(m?.completion_pct).toBe(100)
    expect(m?.severity).toBe("ok")
  })
})

// ---------------------------------------------------------------------------
// REP-301: Catering metrics
// ---------------------------------------------------------------------------

describe("REP-301 — catering metrics", () => {
  it("produces 3 metrics", () => {
    expect(buildCateringMetrics(makeCatering(), NOW)).toHaveLength(3)
  })

  it("unmet_hospitality_requirements > 0 → warning", () => {
    const metrics = buildCateringMetrics(
      makeCatering({ unmet_hospitality_requirements: 2 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "catering.unmet_hospitality_requirements")
    expect(m?.severity).toBe("warning")
    expect(m?.numerator).toBe(2)
  })

  it("all meals approved → ok", () => {
    const metrics = buildCateringMetrics(
      makeCatering({ total_meal_services: 5, meal_services_approved: 5 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "catering.meal_services_approved")
    expect(m?.severity).toBe("ok")
  })
})

// ---------------------------------------------------------------------------
// REP-301: Logistics task metrics
// ---------------------------------------------------------------------------

describe("REP-301 — logistics task metrics", () => {
  it("produces 3 metrics", () => {
    expect(buildLogisticsTaskMetrics(makeTasks(), NOW)).toHaveLength(3)
  })

  it("overdue tasks > 0 → error severity", () => {
    const metrics = buildLogisticsTaskMetrics(
      makeTasks({ tasks_overdue: 3 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "logistics_tasks.overdue")
    expect(m?.severity).toBe("error")
  })

  it("blocked tasks > 0 → warning", () => {
    const metrics = buildLogisticsTaskMetrics(
      makeTasks({ tasks_blocked: 2 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "logistics_tasks.blocked")
    expect(m?.severity).toBe("warning")
  })

  it("all tasks complete → 100% completion, ok state", () => {
    const metrics = buildLogisticsTaskMetrics(
      makeTasks({ total_tasks: 10, tasks_complete: 10 }),
      NOW,
    )
    const m = metrics.find((m) => m.metric_id === "logistics_tasks.completion")
    expect(m?.completion_pct).toBe(100)
    expect(m?.state).toBe("ok")
  })
})

// ---------------------------------------------------------------------------
// REP-301: Aggregated dashboard
// ---------------------------------------------------------------------------

describe("REP-301 — aggregated dashboard", () => {
  it("overall_state is ok when all metrics are healthy", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute({ total_legs: 5, legs_with_provider: 5, legs_with_distance: 5 }),
      travel: makeTravel({ total_party_slots: 5, slots_with_segment: 5, slots_confirmed: 5, unresolved_traveler_count: 0 }),
      lodging: makeLodging({ total_required_room_nights: 5, room_nights_assigned: 5, blocks_confirmed: 2, total_blocks: 2 }),
      equipment: makeEquipment({ total_required_items: 5, items_with_transport: 5, items_with_custody: 5, unresolved_damage_reports: 0 }),
      catering: makeCatering({ total_meal_services: 4, meal_services_with_provider: 4, meal_services_approved: 4, unmet_hospitality_requirements: 0 }),
      tasks: makeTasks({ total_tasks: 5, tasks_complete: 5, tasks_blocked: 0, tasks_overdue: 0 }),
      nowIso: NOW,
    })
    expect(dashboard.overall_state).toBe("ok")
    expect(dashboard.critical_metrics).toHaveLength(0)
  })

  it("overall_state is partial when at least one metric is partial", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute({ legs_with_provider: 5, total_legs: 10 }), // 50% → partial
      travel: makeTravel(),
      lodging: makeLodging({ total_required_room_nights: 5, room_nights_assigned: 5, total_blocks: 2, blocks_confirmed: 2 }),
      equipment: makeEquipment({ total_required_items: 5, items_with_transport: 5, items_with_custody: 5 }),
      catering: makeCatering({ total_meal_services: 4, meal_services_with_provider: 4, meal_services_approved: 4 }),
      tasks: makeTasks({ total_tasks: 5, tasks_complete: 5 }),
      nowIso: NOW,
    })
    expect(["partial", "stale", "unavailable"]).toContain(dashboard.overall_state)
  })

  it("stale data sets overall_state to stale or worse", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute({ freshness_at: STALE }),
      travel: makeTravel(),
      lodging: makeLodging(),
      equipment: makeEquipment(),
      catering: makeCatering(),
      tasks: makeTasks(),
      nowIso: NOW,
    })
    const states = ["stale", "partial", "unavailable", "denied"]
    expect(states).toContain(dashboard.overall_state)
  })

  it("critical_metrics contains error-severity items", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute({ legs_with_constraint_error: 3 }),
      travel: makeTravel({ unresolved_traveler_count: 2 }),
      lodging: makeLodging(),
      equipment: makeEquipment({ unresolved_damage_reports: 1 }),
      catering: makeCatering(),
      tasks: makeTasks({ tasks_overdue: 2 }),
      nowIso: NOW,
    })
    const criticalIds = dashboard.critical_metrics.map((m) => m.metric_id)
    expect(criticalIds).toContain("route.constraint_errors")
    expect(criticalIds).toContain("travel.unresolved_travelers")
    expect(criticalIds).toContain("equipment.unresolved_damage_reports")
    expect(criticalIds).toContain("logistics_tasks.overdue")
  })

  it("dashboard carries tour_id and generated_at", () => {
    const dashboard = buildRouteLogisticsDashboard({
      tourId: TOUR,
      route: makeRoute(),
      travel: makeTravel(),
      lodging: makeLodging(),
      equipment: makeEquipment(),
      catering: makeCatering(),
      tasks: makeTasks(),
      nowIso: NOW,
    })
    expect(dashboard.tour_id).toBe(TOUR)
    expect(dashboard.generated_at).toBe(NOW)
  })
})
