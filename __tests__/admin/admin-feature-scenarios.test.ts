import { describe, expect, it } from "vitest"

import {
  assertIsolatedFixtureTarget,
  buildAdminFeatureScenario,
} from "@/lib/testing/admin-feature-scenarios"
import { ADMIN_FEATURE_FIXTURE } from "@/lib/testing/admin-feature-factory"

describe("REL-006 deterministic Admin feature scenarios", () => {
  it("builds every domain with deterministic parent/child rows and API payloads", () => {
    const first = buildAdminFeatureScenario({ kind: "minimal", org: "a" })
    const second = buildAdminFeatureScenario({ kind: "minimal", org: "a" })

    expect(second).toEqual(first)
    expect(first.domains.map((domain) => domain.domain)).toEqual(ADMIN_FEATURE_FIXTURE.domains)
    expect(first.domains.every((domain) => domain.parents.length && domain.children.length)).toBe(true)
    expect(first.apiPayloads).toHaveLength(ADMIN_FEATURE_FIXTURE.domains.length)
  })

  it("provides realistic volume, DST ambiguity, currency exponents, and protected projections", () => {
    const scenario = buildAdminFeatureScenario({ kind: "realistic", org: "a" })
    const events = scenario.domains.find((domain) => domain.domain === "events")

    expect(events?.parents).toHaveLength(18)
    expect(events?.children).toHaveLength(144)
    expect(scenario.clock.dstFallbackBefore).not.toEqual(scenario.clock.dstFallbackAfter)
    expect(scenario.currencies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "USD", exponent: 2 }),
      expect.objectContaining({ code: "JPY", exponent: 0 }),
    ]))
    expect(scenario.protectedExamples.buyerEmail).toContain("fixture.tourify.test")
  })

  it("models stale versions, revoked access, replay, and guessed cross-org identifiers", () => {
    const edge = buildAdminFeatureScenario({ kind: "edge", org: "a" })
    const attack = buildAdminFeatureScenario({ kind: "crossTenantAttack", org: "a" })

    expect(edge.securityEdges.staleVersion.expected).toBeLessThan(edge.securityEdges.staleVersion.actual)
    expect(new Set(edge.securityEdges.duplicateIdempotencyKeys).size).toBe(1)
    expect(attack.securityEdges.guessedForeignOrgIds.parentId).toBe(
      ADMIN_FEATURE_FIXTURE.domainRecords.tours.b.parentId,
    )
  })

  it("forbids Demo/production fixture targets", () => {
    expect(() => assertIsolatedFixtureTarget("postgres://localhost/tourify_test")).not.toThrow()
    expect(() => assertIsolatedFixtureTarget("preview-branch-admin-fixtures")).not.toThrow()
    expect(() => assertIsolatedFixtureTarget("Tourify Demo production")).toThrow(/forbidden|isolated/i)
    expect(() => assertIsolatedFixtureTarget(undefined)).toThrow(/isolated/i)
  })
})
