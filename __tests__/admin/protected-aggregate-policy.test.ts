import { describe, expect, it } from "vitest"

import {
  hasProtectedAggregateInferenceLeak,
  projectProtectedAggregate,
  resolveProtectedAggregateAccess,
  PROTECTED_AGGREGATE_POLICIES,
} from "@/lib/admin/protected-aggregate-policy"

describe("REP-203 protected aggregate policy", () => {
  it("registers finance, personnel, ticket, customer, and incident classes", () => {
    expect(PROTECTED_AGGREGATE_POLICIES.map((row) => row.class).sort()).toEqual([
      "customer",
      "finance",
      "incident",
      "personnel",
      "ticket",
    ])
  })

  it("denies aggregates without capability using null (never zero)", () => {
    const metric = projectProtectedAggregate({
      metricId: "finance.txn_count",
      aggregateClass: "finance",
      value: 12,
      dimensions: { vendor_name: "Acme" },
      drilldownUrl: "/admin/dashboard/tours/t1?tab=finance&txn=1",
      capabilities: ["tour.view"],
    })
    expect(metric.state).toBe("denied")
    expect(metric.value).toBeNull()
    expect(metric.dimensions).toEqual({})
    expect(metric.drilldownUrl).toBeNull()
    expect(hasProtectedAggregateInferenceLeak({ metric })).toBe(false)
  })

  it("allows finance.view aggregates but redacts money dimensions and drilldowns", () => {
    expect(
      resolveProtectedAggregateAccess({
        aggregateClass: "finance",
        capabilities: ["finance.view"],
      }),
    ).toBe("aggregate_only")

    const metric = projectProtectedAggregate({
      metricId: "finance.txn_count",
      aggregateClass: "finance",
      value: 4,
      dimensions: { vendor_name: "Acme", category: "travel" },
      drilldownUrl: "/admin/finances?id=1",
      capabilities: ["finance.view"],
    })
    expect(metric.state).toBe("dimensions_redacted")
    expect(metric.value).toBe(4)
    expect(metric.dimensions.vendor_name).toBeUndefined()
    expect(metric.dimensions.category).toBe("travel")
    expect(metric.drilldownUrl).toBeNull()
    expect(hasProtectedAggregateInferenceLeak({ metric })).toBe(false)
  })

  it("grants full finance dimensions with finance.manage", () => {
    const metric = projectProtectedAggregate({
      metricId: "finance.txn_count",
      aggregateClass: "finance",
      value: 4,
      dimensions: { vendor_name: "Acme" },
      drilldownUrl: "/admin/finances?id=1",
      capabilities: ["finance.manage"],
    })
    expect(metric.state).toBe("ok")
    expect(metric.dimensions.vendor_name).toBe("Acme")
    expect(metric.drilldownUrl).toBe("/admin/finances?id=1")
  })

  it("requires elevated access for customer and incident aggregates", () => {
    expect(
      projectProtectedAggregate({
        metricId: "customer.active",
        aggregateClass: "customer",
        value: 9,
        capabilities: ["ticketing.view"],
      }).state,
    ).toBe("denied")

    expect(
      projectProtectedAggregate({
        metricId: "incident.open",
        aggregateClass: "incident",
        value: 2,
        dimensions: { involved_parties: ["a"] },
        capabilities: ["event.view"],
      }).value,
    ).toBeNull()

    expect(
      projectProtectedAggregate({
        metricId: "incident.open",
        aggregateClass: "incident",
        value: 2,
        capabilities: ["event.live_ops"],
      }).value,
    ).toBe(2)
  })

  it("flags inference leaks when denied metrics are faked as zero", () => {
    expect(
      hasProtectedAggregateInferenceLeak({
        metric: {
          metricId: "x",
          aggregateClass: "personnel",
          value: 0,
          unit: "count",
          dimensions: {},
          drilldownUrl: null,
          drilldownToken: null,
          state: "denied",
          suppressedDimensions: [],
        },
      }),
    ).toBe(true)
  })
})
