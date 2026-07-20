import { describe, expect, it } from "vitest"
import { resolveRightsReference } from "../rights-reference-resolver"

describe("resolveRightsReference", () => {
  it("does not resolve disputed references", () => {
    const result = resolveRightsReference({ reference: { publicId: "r1", sourceType: "passport", sourceId: "s1", sourceVersion: "1", status: "disputed", publicScopes: ["status"], refreshedAt: new Date().toISOString() }, requestedScope: "status", maxAgeSeconds: 60, now: new Date() })
    expect(result.resolved).toBe(false)
  })
})
