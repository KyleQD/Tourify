import { describe, expect, it } from "vitest"
import { buildEmployerQueryParams } from "@/lib/testing/hiring-real-data-test-helpers"
import type { Phase13ScenarioConfig } from "@/types/hiring-real-data-test"

const venueScenario: Phase13ScenarioConfig = {
  key: "venue-security",
  label: "Venue hires security guards",
  employer: {
    entityType: "venue",
    entityId: "00000000-0000-0000-0000-000000000001",
    displayName: "Test Venue",
  },
}

const orgScenario: Phase13ScenarioConfig = {
  key: "organization-third-party-venue",
  label: "Organization staffs third-party venue",
  employer: {
    entityType: "organization",
    entityId: "00000000-0000-0000-0000-000000000002",
    displayName: "Test Organization",
    scope: {
      venueId: "00000000-0000-0000-0000-000000000003",
    },
  },
}

describe("Phase 13 real-data test helpers", () => {
  it("builds employer query params for venue scope", () => {
    expect(buildEmployerQueryParams(venueScenario)).toBe(
      "entity_type=venue&entity_id=00000000-0000-0000-0000-000000000001"
    )
  })

  it("builds employer query params with third-party venue scope", () => {
    expect(buildEmployerQueryParams(orgScenario)).toBe(
      "entity_type=organization&entity_id=00000000-0000-0000-0000-000000000002&venue_id=00000000-0000-0000-0000-000000000003"
    )
  })
})
