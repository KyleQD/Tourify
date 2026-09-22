import { describe, expect, it } from "vitest"
import {
  assertExternalCannotEnumerateOrg,
  buildEntityGrantInsert,
  DELEGATABLE_CAPABILITIES,
  evaluateEntityGrantAccess,
  filterEnumerableResourcesForGrantee,
  isDelegatableCapability,
  isEntityGrantActive,
  normalizeEntityGrantCapabilities,
  type EntityGrantRecord,
} from "@/lib/admin/entity-grants"

function grant(overrides: Partial<EntityGrantRecord> = {}): EntityGrantRecord {
  return {
    id: "g1",
    orgId: "org-1",
    granteeType: "vendor",
    granteeVendorId: "vendor-1",
    resourceType: "tour",
    resourceId: "tour-1",
    capabilities: ["tour.view", "logistics.view"],
    protectedDataClasses: ["traveler_contact"],
    status: "active",
    expiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("SEC-204 entity grants", () => {
  it("only allows a closed set of delegatable capabilities", () => {
    expect(isDelegatableCapability("tour.view")).toBe(true)
    expect(isDelegatableCapability("finance.pay")).toBe(false)
    expect(isDelegatableCapability("org.roles.manage")).toBe(false)
    expect(DELEGATABLE_CAPABILITIES).not.toContain("finance.pay")

    expect(
      normalizeEntityGrantCapabilities(["tour.view", "finance.pay"]).ok,
    ).toBe(false)
  })

  it("requires future expiry on insert payload", () => {
    expect(() =>
      buildEntityGrantInsert({
        orgId: "org-1",
        actorUserId: "u1",
        granteeType: "venue",
        granteeVenueId: "venue-1",
        resourceType: "event",
        resourceId: "event-1",
        capabilities: ["event.view"],
        expiresAt: "2000-01-01T00:00:00.000Z",
      }),
    ).toThrow(/future/)
  })

  it("evaluates named resource + capability + expiry + protected class", () => {
    const active = evaluateEntityGrantAccess({
      grant: grant(),
      resourceType: "tour",
      resourceId: "tour-1",
      capability: "tour.view",
      protectedDataClass: "traveler_contact",
    })
    expect(active.ok).toBe(true)

    expect(
      evaluateEntityGrantAccess({
        grant: grant(),
        resourceType: "tour",
        resourceId: "tour-2",
        capability: "tour.view",
      }).code,
    ).toBe("resource_mismatch")

    expect(
      evaluateEntityGrantAccess({
        grant: grant(),
        resourceType: "tour",
        resourceId: "tour-1",
        capability: "event.manage",
      }).code,
    ).toBe("capability_not_delegatable")

    expect(
      evaluateEntityGrantAccess({
        grant: grant({ expiresAt: "2020-01-01T00:00:00.000Z" }),
        resourceType: "tour",
        resourceId: "tour-1",
        capability: "tour.view",
      }).code,
    ).toBe("grant_expired")

    expect(
      evaluateEntityGrantAccess({
        grant: grant(),
        resourceType: "tour",
        resourceId: "tour-1",
        capability: "tour.view",
        protectedDataClass: "traveler_identity",
      }).code,
    ).toBe("protected_class_denied")
  })

  it("marks revoked grants inactive", () => {
    expect(
      isEntityGrantActive(
        grant({ status: "revoked", revokedAt: "2026-07-01T00:00:00.000Z" }),
      ),
    ).toBe(false)
  })

  it("prevents external org catalog enumeration", () => {
    expect(
      assertExternalCannotEnumerateOrg({
        isOrgMember: false,
        listMode: "org_catalog",
      }).ok,
    ).toBe(false)

    expect(
      assertExternalCannotEnumerateOrg({
        isOrgMember: false,
        listMode: "granted_resources",
      }).ok,
    ).toBe(true)

    const visible = filterEnumerableResourcesForGrantee({
      requestedResourceIds: ["tour-1", "tour-2", "tour-3"],
      grants: [grant(), grant({ resourceId: "tour-3", id: "g2" })],
      resourceType: "tour",
    })
    expect(visible).toEqual(["tour-1", "tour-3"])
  })

  it("rejects non-delegatable capabilities in insert builder", () => {
    expect(() =>
      buildEntityGrantInsert({
        orgId: "org-1",
        actorUserId: "u1",
        granteeType: "contractor",
        granteeUserId: "u2",
        resourceType: "tour",
        resourceId: "tour-1",
        capabilities: ["finance.pay"] as never,
        expiresAt: "2099-06-01T00:00:00.000Z",
      }),
    ).toThrow(/Non-delegatable/)
  })
})
