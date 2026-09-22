import { describe, expect, it } from "vitest"

import {
  canDiscoverSiteMapByInheritance,
  evaluateMapShareTokenGate,
  MAP101_CAPABILITY_PERMS,
  MAP101_DISCOVERY_ROLES,
  MAP101_POLICY_PREFIX,
  MAP101_SCOPED_EXTERNAL_PATHS,
  mapDiscoveryRole,
} from "@/lib/admin/map-access-contract"

describe("MAP-101 map access / org inheritance contract", () => {
  it("documents discovery roles and capability perms", () => {
    expect(MAP101_POLICY_PREFIX).toBe("map101_")
    expect(MAP101_DISCOVERY_ROLES).toEqual(
      expect.arrayContaining(["owner", "org_capability", "collaborator", "public_token"]),
    )
    expect(MAP101_CAPABILITY_PERMS).toContain("logistics.view")
    expect(MAP101_SCOPED_EXTERNAL_PATHS).toContain("/api/site-maps/public/[token]")
  })

  it("lets capability users discover maps without being owner/collaborator", () => {
    expect(
      canDiscoverSiteMapByInheritance({
        isOwner: false,
        isActiveCollaborator: false,
        hasOrgLogisticsCapability: true,
      }),
    ).toBe(true)
    expect(
      mapDiscoveryRole({
        isOwner: false,
        isActiveCollaborator: false,
        hasOrgLogisticsCapability: true,
      }),
    ).toBe("org_capability")
  })

  it("keeps non-org users from discovering private maps", () => {
    expect(
      canDiscoverSiteMapByInheritance({
        isOwner: false,
        isActiveCollaborator: false,
        hasOrgLogisticsCapability: false,
      }),
    ).toBe(false)
  })

  it("keeps collaborator discovery scoped to active invites", () => {
    expect(
      canDiscoverSiteMapByInheritance({
        isOwner: false,
        isActiveCollaborator: true,
        hasOrgLogisticsCapability: false,
      }),
    ).toBe(true)
    expect(
      mapDiscoveryRole({
        isOwner: false,
        isActiveCollaborator: true,
        hasOrgLogisticsCapability: false,
      }),
    ).toBe("collaborator")
  })

  it("gates share tokens as inactive/expired/scoped", () => {
    expect(
      evaluateMapShareTokenGate({
        is_active: true,
        expires_at: null,
        site_map_id: "map-1",
      }).ok,
    ).toBe(true)

    expect(
      evaluateMapShareTokenGate({
        is_active: false,
        expires_at: null,
        site_map_id: "map-1",
      }),
    ).toEqual({ ok: false, reason: "inactive" })

    expect(
      evaluateMapShareTokenGate({
        is_active: true,
        expires_at: "2020-01-01T00:00:00.000Z",
        site_map_id: "map-1",
        nowMs: Date.parse("2026-07-20T00:00:00.000Z"),
      }),
    ).toEqual({ ok: false, reason: "expired" })
  })
})
