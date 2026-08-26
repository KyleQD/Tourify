import { describe, expect, it } from "vitest"
import {
  RLS_ORG_SCOPED_DOMAIN_TABLES,
  RLS_PARENT_CHILD_DOMAINS,
  RLS_PERSONAS,
  buildCoreTourIsolationCases,
  buildOrgScopedDomainCases,
  fixtureIdsForOrg,
  isRlsDatabaseConfigured,
} from "@/lib/testing/rls-persona-matrix"

describe("REL-101 RLS persona matrix contract", () => {
  it("covers required personas", () => {
    expect(RLS_PERSONAS).toEqual(
      expect.arrayContaining([
        "anonymous",
        "org_a_owner",
        "org_b_owner",
        "org_a_viewer",
        "org_a_worker",
        "service_role",
        "multi_org_unselected",
      ]),
    )
  })

  it("includes parent/child domain pairs for tours/events", () => {
    const parents = RLS_PARENT_CHILD_DOMAINS.map((row) => row.parent)
    expect(parents).toContain("tours")
    expect(parents).toContain("events_v2")
  })

  it("builds cross-org denial cases for tours and events", () => {
    const cases = buildCoreTourIsolationCases()
    expect(cases.length).toBeGreaterThanOrEqual(8)
    expect(cases.some((row) => row.expect === "deny" && row.targetOrg === "b")).toBe(true)
    expect(cases.some((row) => row.persona === "anonymous" && row.expect === "deny")).toBe(true)
  })

  it("keeps fixture org identifiers distinct", () => {
    expect(fixtureIdsForOrg("a").orgId).not.toEqual(fixtureIdsForOrg("b").orgId)
    expect(fixtureIdsForOrg("a").tourId).not.toEqual(fixtureIdsForOrg("b").tourId)
  })

  it("builds cross-tenant cases for every ADM-M-002 org-scoped domain (REL-101 extension)", () => {
    const cases = buildOrgScopedDomainCases()
    for (const table of RLS_ORG_SCOPED_DOMAIN_TABLES) {
      const tableCases = cases.filter((row) => row.table === table)
      expect(tableCases.some((row) => row.action === "select" && row.expect === "deny" && row.targetOrg === "b"), `${table} cross-org select deny`).toBe(true)
      expect(tableCases.some((row) => row.action === "insert" && row.expect === "deny" && row.persona === "org_b_owner"), `${table} cross-org insert deny`).toBe(true)
      expect(tableCases.some((row) => row.persona === "anonymous" && row.expect === "deny"), `${table} anonymous deny`).toBe(true)
      expect(tableCases.some((row) => row.persona === "org_a_owner" && row.expect === "allow"), `${table} own-org allow`).toBe(true)
    }
    // 6 generated cases per table
    expect(cases.length).toBe(RLS_ORG_SCOPED_DOMAIN_TABLES.length * 6)
  })

  it("documents when the live DB suite is enabled", () => {
    // Structural suite always runs; live DB suite requires ADMIN_RLS_TEST_DATABASE_URL.
    expect(typeof isRlsDatabaseConfigured()).toBe("boolean")
  })
})
