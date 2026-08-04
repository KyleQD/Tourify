import { describe, expect, it } from "vitest"

import {
  DASHBOARD_DOMAIN_DEFINITIONS,
  deniedDashboardDomain,
  resolvedDashboardDomain,
  unavailableDashboardDomain,
} from "@/lib/admin/dashboard-command-center"

describe("dashboard command center domain states", () => {
  const definition = DASHBOARD_DOMAIN_DEFINITIONS[0]
  const asOf = "2026-07-21T00:00:00.000Z"

  it("does not expose a protected count when access is denied", () => {
    expect(deniedDashboardDomain(definition, asOf)).toMatchObject({ status: "denied", count: null })
  })

  it("distinguishes a real zero from an unavailable source", () => {
    expect(resolvedDashboardDomain(definition, asOf, 0)).toMatchObject({ status: "empty", count: 0 })
    expect(unavailableDashboardDomain(definition, asOf)).toMatchObject({ status: "unavailable", count: null })
  })
})
