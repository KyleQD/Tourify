import { describe, expect, it } from "vitest"

import {
  DEMO_MUTATION_ERROR,
  extractEventVenueId,
  extractEventVenueName,
  shouldLoadLiveSchedulingDetails,
} from "@/components/admin/scheduling/use-scheduling-data"
import { resolveSchedulingVenueId } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"

describe("scheduling venue resolution", () => {
  it("extracts venue_id from event settings.venue_account_id", () => {
    expect(
      extractEventVenueId({
        id: "evt_1",
        settings: { venue_account_id: "venue_from_settings" },
      }),
    ).toBe("venue_from_settings")
  })

  it("prefers top-level venue_id over settings", () => {
    expect(
      extractEventVenueId({
        venue_id: "venue_top",
        settings: { venue_account_id: "venue_settings" },
      }),
    ).toBe("venue_top")
  })

  it("extracts nested venue name", () => {
    expect(
      extractEventVenueName({
        venue: { id: "v1", name: "The Fillmore" },
      }),
    ).toBe("The Fillmore")
  })

  it("resolveSchedulingVenueId uses venue employer entity id", () => {
    const employer: HiringEntity = {
      entityType: "venue",
      entityId: "venue_abc",
      displayName: "Venue ABC",
    }
    expect(resolveSchedulingVenueId(employer)).toBe("venue_abc")
  })

  it("resolveSchedulingVenueId uses scope.venueId for org employers", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
      scope: { venueId: "venue_scoped" },
    }
    expect(resolveSchedulingVenueId(employer)).toBe("venue_scoped")
  })

  it("resolveSchedulingVenueId returns null for org without venue scope", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
    }
    expect(resolveSchedulingVenueId(employer)).toBeNull()
  })

  it("exports demo mutation guard message", () => {
    expect(DEMO_MUTATION_ERROR).toContain("Switch to Live")
  })

  it("does not load live shifts or zones for an org until a venue is selected", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
    }

    expect(shouldLoadLiveSchedulingDetails({ mode: "live", employer, venueId: null })).toBe(false)
    expect(shouldLoadLiveSchedulingDetails({ mode: "live", employer, venueId: "venue_1" })).toBe(true)
    expect(shouldLoadLiveSchedulingDetails({ mode: "demo", employer, venueId: "venue_1" })).toBe(false)
  })
})
