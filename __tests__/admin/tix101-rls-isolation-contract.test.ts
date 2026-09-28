import { describe, expect, it } from "vitest"

import { SEC108_DROPPED_PERMISSIVE_POLICIES } from "@/lib/admin/legacy-ticketing-rls-contract"
import {
  assertTix101IsolationCoverage,
  buildTix101OrgIsolationCases,
  isTix101DroppedPolicy,
  TIX101_DROPPED_POLICIES,
  TIX101_ISOLATION_TABLES,
  TIX101_PARENT_CHAIN,
  TIX101_VERIFY_RPC,
} from "@/lib/admin/tix101-rls-isolation-contract"

describe("TIX-101 ticketing blanket drop + Org A/B isolation", () => {
  it("includes SEC-108 drops plus residual analytics insert blanket", () => {
    for (const name of SEC108_DROPPED_PERMISSIVE_POLICIES)
      expect(TIX101_DROPPED_POLICIES).toContain(name)
    expect(isTix101DroppedPolicy("ticket_types_all")).toBe(true)
    expect(isTix101DroppedPolicy("ticket_analytics_events_insert")).toBe(true)
    expect(isTix101DroppedPolicy("ticket_types_select")).toBe(false)
  })

  it("covers destination tables with events_v2 parent chain", () => {
    expect(TIX101_ISOLATION_TABLES).toEqual(
      expect.arrayContaining(["ticket_types", "ticket_sales", "tickets", "event_ticketing_config"]),
    )
    expect(TIX101_PARENT_CHAIN).toEqual({
      parent: "events_v2",
      parentKey: "org_id",
      childFk: "event_id",
    })
    expect(TIX101_VERIFY_RPC).toBe("admin_verify_tix101_no_blanket_policies")
  })

  it("builds Org A allow / Org B deny cases for parent and record-id isolation", () => {
    const cases = buildTix101OrgIsolationCases()
    expect(cases.length).toBeGreaterThan(20)

    const coverage = assertTix101IsolationCoverage(cases)
    expect(coverage.ok).toBe(true)

    const aAllow = cases.find(
      (c) =>
        c.table === "ticket_types"
        && c.persona === "org_a_owner"
        && c.targetOrg === "a"
        && c.expect === "allow",
    )
    const bDeny = cases.find(
      (c) =>
        c.table === "ticket_types"
        && c.persona === "org_a_owner"
        && c.targetOrg === "b"
        && c.expect === "deny"
        && c.isolation === "record_id",
    )
    expect(aAllow).toBeTruthy()
    expect(bDeny).toBeTruthy()
  })
})
