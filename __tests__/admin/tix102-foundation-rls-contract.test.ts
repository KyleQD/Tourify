import { describe, expect, it } from "vitest"

import {
  assertTix102SurfaceCoverage,
  isTix102ReplacedPolicy,
  TIX102_COVERED_SURFACES,
  TIX102_GRANT_SEMANTICS,
  TIX102_HELPERS,
  TIX102_POLICY_PREFIX,
  TIX102_REPLACED_POLICIES,
  TIX102_VERIFY_RPC,
} from "@/lib/admin/tix102-foundation-rls-contract"

describe("TIX-102 foundation ticketing RLS contract", () => {
  it("covers every AC surface with event/org/grant language", () => {
    const coverage = assertTix102SurfaceCoverage(TIX102_COVERED_SURFACES)
    expect(coverage.ok).toBe(true)
    expect(TIX102_COVERED_SURFACES.map((s) => s.surface)).toEqual(
      expect.arrayContaining([
        "config",
        "inventory",
        "customer_order",
        "ticket",
        "credential",
        "transfer",
        "check_in",
        "allocation",
        "reservation",
        "webhook",
        "analytics",
      ]),
    )
  })

  it("documents grant-row-only semantics (membership no longer implies grant)", () => {
    expect(TIX102_GRANT_SEMANTICS.membershipImpliedGrant).toBe(false)
    expect(TIX102_GRANT_SEMANTICS.requiresGrantRow).toBe(true)
    expect(TIX102_HELPERS).toEqual(
      expect.arrayContaining(["can_ticketing", "can_ticketing_on_event", "has_event_ticketing_grant"]),
    )
    expect(TIX102_VERIFY_RPC).toBe("admin_verify_tix102_foundation_rls")
  })

  it("lists membership FOR ALL policies replaced by tix102_* prefix", () => {
    expect(TIX102_REPLACED_POLICIES).toContain("ticket_allocations_all")
    expect(TIX102_REPLACED_POLICIES).toContain("ticket_revenue_allocations_all")
    expect(isTix102ReplacedPolicy("tickets_select")).toBe(true)
    expect(isTix102ReplacedPolicy("tix102_tickets_select")).toBe(false)
    expect(TIX102_POLICY_PREFIX).toBe("tix102_")
  })

  it("keeps webhook client-deny and customer/order on ticket_sales capability path", () => {
    const webhook = TIX102_COVERED_SURFACES.find((s) => s.surface === "webhook")
    const order = TIX102_COVERED_SURFACES.find((s) => s.surface === "customer_order")
    expect(webhook?.gate).toMatch(/deny/i)
    expect(order?.table).toBe("ticket_sales")
    expect(order?.gate).toMatch(/has_perm/)
  })
})
