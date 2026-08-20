import { describe, expect, it } from "vitest"

import {
  assertCommerceCrossScopeBaseline,
  COMMERCE_CROSS_SCOPE_ACCESS_BASELINE,
  listCommerceLegacyGlobalAdminSurfaces,
} from "@/lib/admin/commerce-cross-scope-access-baseline"

describe("COM-021 commerce cross-scope access baseline", () => {
  it("records evidence and fails closed for non-legacy cross-org access", () => {
    const coverage = assertCommerceCrossScopeBaseline()

    expect(coverage.ok).toBe(true)
    expect(coverage.missingEvidence).toEqual([])
    expect(coverage.crossOrgAllows).toEqual([])
    expect(coverage.unavailableWithoutReason).toEqual([])
  })

  it("keeps current marketplace admin global access visible as a migration risk", () => {
    expect(listCommerceLegacyGlobalAdminSurfaces()).toEqual(
      expect.arrayContaining([
        "marketplace_admin_orders",
        "marketplace_admin_order_detail",
        "marketplace_payout_retry",
      ]),
    )

    const legacyCrossOrgAllows = COMMERCE_CROSS_SCOPE_ACCESS_BASELINE.filter(
      (item) =>
        item.boundary === "legacy_global_admin"
        && item.targetOrg === "org_b"
        && item.decision === "allow",
    )

    expect(legacyCrossOrgAllows.length).toBeGreaterThanOrEqual(3)
    expect(legacyCrossOrgAllows.map((item) => item.commerceRequirement)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/commerce\.view/),
        expect.stringMatching(/commerce\.manage_payouts/),
      ]),
    )
  })

  it("covers finance, ticketing, subscription, and paid-promotion scope baselines", () => {
    expect(COMMERCE_CROSS_SCOPE_ACCESS_BASELINE).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "finance_reconciliation",
          persona: "org_b_owner",
          targetOrg: "org_a",
          decision: "deny",
          boundary: "organization",
        }),
        expect.objectContaining({
          surface: "finance_settlements",
          targetEvent: "event_b",
          decision: "deny",
          boundary: "organization",
        }),
        expect.objectContaining({
          surface: "ticketing_admin_read_model",
          targetEvent: "event_b",
          decision: "deny",
          boundary: "event",
        }),
        expect.objectContaining({
          surface: "ticketing_refund",
          targetEvent: "event_b",
          decision: "deny",
          boundary: "event",
        }),
        expect.objectContaining({
          surface: "subscription_admin_reconciliation",
          decision: "unavailable",
          boundary: "not_implemented",
        }),
        expect.objectContaining({
          surface: "paid_promotion_admin_reconciliation",
          decision: "unavailable",
          boundary: "not_implemented",
        }),
      ]),
    )
  })

  it("keeps anonymous users denied on the legacy marketplace baseline", () => {
    expect(COMMERCE_CROSS_SCOPE_ACCESS_BASELINE).toContainEqual(
      expect.objectContaining({
        surface: "marketplace_admin_orders",
        persona: "anonymous",
        decision: "deny",
      }),
    )
  })
})
