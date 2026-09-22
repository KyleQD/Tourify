import { describe, it, expect } from "vitest"
import {
  evaluateMetricSeverity,
  buildLiveDashboardRow,
  buildLiveDashboard,
  computeDashboardSeverity,
  getMetricById,
  LIVE_METRICS,
} from "@/lib/admin/live-ops-report"

describe("evaluateMetricSeverity", () => {
  it("ok when below all thresholds", () => {
    const def = LIVE_METRICS.find((m) => m.metric_id === "workforce_coverage_deficit")!
    expect(evaluateMetricSeverity(def, 0)).toBe("ok")
  })

  it("warning at threshold 1", () => {
    const def = LIVE_METRICS.find((m) => m.metric_id === "workforce_coverage_deficit")!
    expect(evaluateMetricSeverity(def, 1)).toBe("warning")
  })

  it("error at threshold 3", () => {
    const def = LIVE_METRICS.find((m) => m.metric_id === "workforce_coverage_deficit")!
    expect(evaluateMetricSeverity(def, 3)).toBe("error")
  })
})

describe("getMetricById", () => {
  it("returns metric by id", () => {
    const m = getMetricById("open_tasks_critical")
    expect(m).toBeDefined()
    expect(m?.label).toBe("Critical Open Tasks")
  })

  it("returns undefined for unknown id", () => {
    expect(getMetricById("unknown_metric")).toBeUndefined()
  })
})

describe("buildLiveDashboard", () => {
  it("builds all 9 rows", () => {
    const rows = buildLiveDashboard({})
    expect(rows).toHaveLength(LIVE_METRICS.length)
    expect(rows.every((r) => r.severity === "ok")).toBe(true) // all zero → all ok
  })

  it("reflects supplied values", () => {
    const rows = buildLiveDashboard({ open_tasks_critical: 1 })
    const row = rows.find((r) => r.metric_id === "open_tasks_critical")!
    expect(row.severity).toBe("critical")
    expect(row.value).toBe(1)
  })
})

describe("computeDashboardSeverity", () => {
  it("ok when all rows ok", () => {
    const rows = buildLiveDashboard({})
    expect(computeDashboardSeverity(rows)).toBe("ok")
  })

  it("returns worst severity across rows", () => {
    const rows = buildLiveDashboard({ open_incidents_high_severity: 1, advance_overdue_sections: 1 })
    expect(computeDashboardSeverity(rows)).toBe("critical")
  })
})
