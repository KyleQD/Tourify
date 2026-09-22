import { describe, it, expect } from "vitest"
import {
  buildStopHealthSignals,
  computeStopHealthSummary,
  buildTourLiveHealthRollup,
} from "@/lib/admin/tour-live-health"

describe("buildStopHealthSignals", () => {
  it("returns no signals when all healthy", () => {
    const signals = buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 0, credential_violations: 0, labor_rest_conflicts: 0 },
      { stop_id: "s1", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s1", unacknowledged_recipients: 0 },
      { stop_id: "s1", open_incidents: 0, critical_incidents: 0 },
    )
    expect(signals).toHaveLength(0)
  })

  it("emits critical signal for large coverage deficit", () => {
    const signals = buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 5, credential_violations: 0, labor_rest_conflicts: 0 },
      { stop_id: "s1", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s1", unacknowledged_recipients: 0 },
      { stop_id: "s1", open_incidents: 0, critical_incidents: 0 },
    )
    const cov = signals.find((s) => s.signal_type === "workforce_coverage")!
    expect(cov.severity).toBe("critical")
    expect(cov.count).toBe(5)
  })

  it("emits critical signal for critical incidents", () => {
    const signals = buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 0, credential_violations: 0, labor_rest_conflicts: 0 },
      { stop_id: "s1", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s1", unacknowledged_recipients: 0 },
      { stop_id: "s1", open_incidents: 2, critical_incidents: 1 },
    )
    expect(signals.find((s) => s.signal_type === "incident_critical")?.severity).toBe("critical")
  })

  it("covers all 8 signal types when all bad", () => {
    const signals = buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 2, credential_violations: 1, labor_rest_conflicts: 1 },
      { stop_id: "s1", overdue_sections: 1, unapproved_sections: 1 },
      { stop_id: "s1", unacknowledged_recipients: 1 },
      { stop_id: "s1", open_incidents: 1, critical_incidents: 1 },
    )
    expect(signals).toHaveLength(8)
  })
})

describe("computeStopHealthSummary", () => {
  it("ok when no signals", () => {
    const s = computeStopHealthSummary("s1", [])
    expect(s.overall_severity).toBe("ok")
  })

  it("picks worst severity", () => {
    const signals = buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 5, credential_violations: 2, labor_rest_conflicts: 0 },
      { stop_id: "s1", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s1", unacknowledged_recipients: 0 },
      { stop_id: "s1", open_incidents: 0, critical_incidents: 1 },
    )
    const s = computeStopHealthSummary("s1", signals)
    expect(s.overall_severity).toBe("critical")
  })
})

describe("buildTourLiveHealthRollup", () => {
  it("aggregates stop summaries", () => {
    const s1 = computeStopHealthSummary("s1", buildStopHealthSignals(
      { stop_id: "s1", coverage_deficit: 0, credential_violations: 0, labor_rest_conflicts: 0 },
      { stop_id: "s1", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s1", unacknowledged_recipients: 0 },
      { stop_id: "s1", open_incidents: 0, critical_incidents: 0 },
    ))
    const s2 = computeStopHealthSummary("s2", buildStopHealthSignals(
      { stop_id: "s2", coverage_deficit: 2, credential_violations: 0, labor_rest_conflicts: 1 },
      { stop_id: "s2", overdue_sections: 0, unapproved_sections: 0 },
      { stop_id: "s2", unacknowledged_recipients: 0 },
      { stop_id: "s2", open_incidents: 0, critical_incidents: 0 },
    ))
    const rollup = buildTourLiveHealthRollup([s1, s2])
    expect(rollup.total_stops).toBe(2)
    expect(rollup.stops_ok).toBe(1)
    expect(rollup.stops_with_error).toBe(1)
    expect(rollup.worst_severity).toBe("error")
  })
})
