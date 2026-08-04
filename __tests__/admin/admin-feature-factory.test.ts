import { describe, expect, it } from "vitest"
import {
  ADMIN_FEATURE_FIXTURE,
  actingHeadersForOrg,
  fixtureOrg,
  unpersistedFixtureDomains,
} from "@/lib/testing/admin-feature-factory"

describe("SEC-004 admin feature factory", () => {
  it("keeps org A and org B identifiers distinct", () => {
    const a = fixtureOrg("a")
    const b = fixtureOrg("b")
    expect(a.orgId).not.toEqual(b.orgId)
    expect(a.profileId).not.toEqual(b.profileId)
  })

  it("includes a multi-org user and role coverage for org A", () => {
    expect(ADMIN_FEATURE_FIXTURE.users.multiOrg.memberships).toEqual([
      { org: "a", role: "viewer" },
      { org: "b", role: "tour_manager" },
    ])
    expect(ADMIN_FEATURE_FIXTURE.users.orgAOwner.role).toBe("owner")
    expect(ADMIN_FEATURE_FIXTURE.users.orgAManager.role).toBe("tour_manager")
    expect(ADMIN_FEATURE_FIXTURE.users.orgAViewer.role).toBe("viewer")
    expect(ADMIN_FEATURE_FIXTURE.users.orgAWorker.role).toBe("worker")
    expect(ADMIN_FEATURE_FIXTURE.users.orgBOwner.role).toBe("owner")
    expect(ADMIN_FEATURE_FIXTURE.users.orgBManager.role).toBe("tour_manager")
    expect(ADMIN_FEATURE_FIXTURE.users.orgBViewer.role).toBe("viewer")
    expect(ADMIN_FEATURE_FIXTURE.users.orgBWorker.role).toBe("worker")
  })

  it("builds acting headers that bind profile and org", () => {
    const headers = actingHeadersForOrg("a")
    expect(headers["x-acting-account-type"]).toBe("organization")
    expect(headers["x-acting-org-id"]).toBe(fixtureOrg("a").orgId)
    expect(headers["x-acting-profile-id"]).toBe(fixtureOrg("a").profileId)
  })

  it("covers audited domain list for fixture expansion", () => {
    expect(ADMIN_FEATURE_FIXTURE.domains).toContain("ticketing")
    expect(ADMIN_FEATURE_FIXTURE.domains).toContain("finance")
    expect(ADMIN_FEATURE_FIXTURE.tours.aMultiStop.stopIds.length).toBeGreaterThanOrEqual(2)
    expect(Object.keys(ADMIN_FEATURE_FIXTURE.domainRecords).sort()).toEqual(
      [...ADMIN_FEATURE_FIXTURE.domains].sort(),
    )
    for (const record of Object.values(ADMIN_FEATURE_FIXTURE.domainRecords)) {
      expect(record.a.parentId).not.toEqual(record.b.parentId)
      expect(record.a.childId).not.toEqual(record.b.childId)
    }
    expect(unpersistedFixtureDomains()).toEqual(["contracts"])
  })

  it("uses PostgreSQL UUIDs for every identity", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const serialized = JSON.stringify(ADMIN_FEATURE_FIXTURE)
    const ids = serialized.match(/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/gi) || []
    expect(ids.length).toBeGreaterThan(20)
    for (const id of ids) expect(id).toMatch(uuid)
  })
})
