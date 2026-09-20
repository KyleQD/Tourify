import { describe, expect, it } from "vitest"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  ADMIN_API_ROUTE_REGISTRY,
  adminCommandCapabilities,
} from "@/lib/admin/api-route-registry"

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8")
}

describe("Admin artist roster route contract", () => {
  it("uses the canonical capability wrapper with method-level workforce capabilities", () => {
    const collection = read("app/api/admin/artists/route.ts")
    const detail = read("app/api/admin/artists/[id]/route.ts")

    expect(collection).toContain("withAdminCapability")
    expect(detail).toContain("withAdminCapability")
    expect(collection).toContain("workforce.view")
    expect(collection).toContain("workforce.manage")
    expect(detail).toContain("workforce.view")
    expect(detail).toContain("workforce.manage")
  })

  it("retains organization roster scope at the resource boundary", () => {
    expect(read("app/api/admin/artists/route.ts")).toContain(
      "resolveOrgArtistRosterScope",
    )
    expect(read("app/api/admin/artists/[id]/route.ts")).toContain(
      "resolveOrgArtistRosterScope",
    )
  })

  it("records read and write capabilities in the admin registry", () => {
    const collection = ADMIN_API_ROUTE_REGISTRY.find(
      (entry) => entry.route === "/api/admin/artists",
    )!
    const detail = ADMIN_API_ROUTE_REGISTRY.find(
      (entry) => entry.route === "/api/admin/artists/[id]",
    )!

    expect(collection.authClass).toBe("capability_gated")
    expect(detail.authClass).toBe("capability_gated")
    expect(adminCommandCapabilities(collection, "GET")).toEqual([
      "workforce.view",
    ])
    expect(adminCommandCapabilities(collection, "POST")).toEqual([
      "workforce.manage",
    ])
    expect(adminCommandCapabilities(detail, "GET")).toEqual([
      "workforce.view",
    ])
    expect(adminCommandCapabilities(detail, "PATCH")).toEqual([
      "workforce.manage",
    ])
    expect(adminCommandCapabilities(detail, "DELETE")).toEqual([
      "workforce.manage",
    ])
  })
})
