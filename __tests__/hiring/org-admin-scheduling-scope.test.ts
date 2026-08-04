import { describe, expect, it } from "vitest"

import { buildEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"
import { hiringEntityFromAccount } from "@/lib/hiring/hiring-entity-from-account"
import {
  getLiveSchedulingScopeFlags,
  resolveSchedulingVenueId,
} from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"

describe("buildEmployerFromSearchParams", () => {
  it("keeps organization identity when venue_id is also present", () => {
    const employer = buildEmployerFromSearchParams({
      searchParams: {
        entity_type: "organization",
        entity_id: "11111111-1111-1111-1111-111111111111",
        venue_id: "22222222-2222-2222-2222-222222222222",
        display_name: "Test Events & Tours LLC",
      },
    })

    expect(employer).toEqual({
      entityType: "organization",
      entityId: "11111111-1111-1111-1111-111111111111",
      displayName: "Test Events & Tours LLC",
      scope: {
        venueId: "22222222-2222-2222-2222-222222222222",
        eventId: undefined,
        tourId: undefined,
      },
    })
  })

  it("uses legacy venue_id alone as venue employer", () => {
    const employer = buildEmployerFromSearchParams({
      searchParams: {
        venue_id: "22222222-2222-2222-2222-222222222222",
        display_name: "The Fillmore",
      },
    })

    expect(employer?.entityType).toBe("venue")
    expect(employer?.entityId).toBe("22222222-2222-2222-2222-222222222222")
    expect(employer?.scope?.venueId).toBe("22222222-2222-2222-2222-222222222222")
  })

  it("returns null when no entity or venue params exist", () => {
    expect(buildEmployerFromSearchParams({ searchParams: { tab: "scheduling" } })).toBeNull()
  })
})

describe("hiringEntityFromAccount", () => {
  it("maps organization accounts to HiringEntity", () => {
    const employer = hiringEntityFromAccount({
      account_type: "organization",
      profile_id: "11111111-1111-1111-1111-111111111111",
      profile_data: { organization_name: "Test Events & Tours LLC" },
    })

    expect(employer).toMatchObject({
      entityType: "organization",
      entityId: "11111111-1111-1111-1111-111111111111",
      displayName: "Test Events & Tours LLC",
    })
    expect(employer?.scope?.venueId).toBeUndefined()
  })

  it("maps legacy admin account type to organization", () => {
    const employer = hiringEntityFromAccount({
      account_type: "admin",
      profile_id: "11111111-1111-1111-1111-111111111111",
      display_name: "Legacy Org",
    })
    expect(employer?.entityType).toBe("organization")
  })

  it("returns null for personal/general accounts", () => {
    expect(
      hiringEntityFromAccount({
        account_type: "general",
        profile_id: "11111111-1111-1111-1111-111111111111",
      }),
    ).toBeNull()
  })

  it("sets venue scope for venue accounts", () => {
    const employer = hiringEntityFromAccount({
      account_type: "venue",
      profile_id: "22222222-2222-2222-2222-222222222222",
      profile_data: { venue_name: "Venue A" },
    })
    expect(employer?.entityType).toBe("venue")
    expect(employer?.scope?.venueId).toBe("22222222-2222-2222-2222-222222222222")
  })
})

describe("org live venue needs", () => {
  const orgEmployer: HiringEntity = {
    entityType: "organization",
    entityId: "11111111-1111-1111-1111-111111111111",
    displayName: "Org",
  }

  it("org without scope.venueId needs venue from event/URL", () => {
    expect(resolveSchedulingVenueId(orgEmployer)).toBeNull()
  })

  it("org with scope.venueId resolves venue", () => {
    expect(
      resolveSchedulingVenueId({
        ...orgEmployer,
        scope: { venueId: "22222222-2222-2222-2222-222222222222" },
      }),
    ).toBe("22222222-2222-2222-2222-222222222222")
  })

  it("Live + org employer without venue → needsVenue false, needsEmployer false", () => {
    expect(
      getLiveSchedulingScopeFlags({
        mode: "live",
        employer: orgEmployer,
        venueId: null,
      }),
    ).toEqual({ needsEmployer: false, needsVenue: false })
  })

  it("Live without employer → needsEmployer true", () => {
    expect(
      getLiveSchedulingScopeFlags({
        mode: "live",
        employer: null,
        venueId: null,
      }),
    ).toEqual({ needsEmployer: true, needsVenue: false })
  })

  it("Demo never needs employer or venue gates", () => {
    expect(
      getLiveSchedulingScopeFlags({
        mode: "demo",
        employer: null,
        venueId: null,
      }),
    ).toEqual({ needsEmployer: false, needsVenue: false })
  })
})
