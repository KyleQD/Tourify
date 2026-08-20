import { describe, expect, it } from "vitest"

import {
  assertCommercePermission,
  assertAnyCommercePermission,
  COMMERCE_PERMISSION_DEFINITIONS,
  COMMERCE_PERMISSIONS,
  createCommerceContextFromAdmin,
  createCommercePermissionSet,
  hasAllCommercePermissions,
  hasAnyCommercePermission,
  hasCommercePermission,
  isCommercePermission,
  requiresHighRiskCommercePermission,
} from "@/lib/admin/commerce/context"
import type { ActingAdminContext } from "@/lib/auth/admin-context"

const adminContext: ActingAdminContext = {
  userId: "user-a",
  profileId: "profile-a",
  accountType: "organization",
  orgId: "org-a",
  membershipRole: "finance",
  capabilities: ["finance.view", "finance.manage"],
  source: "header",
  scope: "organization",
  allowedTourIds: [],
  correlationId: "request-123456",
}

describe("COM-023 CommerceContext contract", () => {
  it("defines the public Commerce permission catalog", () => {
    expect(COMMERCE_PERMISSIONS).toEqual([
      "commerce.view",
      "commerce.view_customers",
      "commerce.view_seller_pii",
      "commerce.manage_orders",
      "commerce.manage_fulfillment",
      "commerce.manage_listings",
      "commerce.manage_sellers",
      "commerce.manage_cases",
      "commerce.manage_disputes",
      "commerce.issue_refunds",
      "commerce.view_financials",
      "commerce.retry_payouts",
      "commerce.manage_payouts",
      "commerce.manage_settlements",
      "commerce.manage_fees",
      "commerce.manage_subscriptions",
      "commerce.export",
      "commerce.view_audit",
    ])
  })

  it("normalizes Commerce permissions and rejects unknown strings", () => {
    const permissions = createCommercePermissionSet([
      "finance.view",
      "unknown",
      "commerce.manage_payouts",
      "commerce.manage_payouts",
    ])

    expect(permissions.permissions).toEqual([
      "commerce.view",
      "commerce.view_financials",
      "commerce.retry_payouts",
      "commerce.manage_payouts",
    ])
    expect(isCommercePermission("commerce.export")).toBe(true)
    expect(isCommercePermission("finance.view")).toBe(false)
  })

  it("defines permission metadata, implication, and high-risk helpers", () => {
    expect(COMMERCE_PERMISSION_DEFINITIONS["commerce.view_customers"]).toMatchObject({
      category: "customer_data",
      risk: "sensitive",
      implies: ["commerce.view"],
    })
    expect(COMMERCE_PERMISSION_DEFINITIONS["commerce.manage_payouts"]).toMatchObject({
      category: "payouts",
      risk: "financial",
    })

    const permissions = createCommercePermissionSet(["commerce.issue_refunds", "commerce.view_audit"])
    expect(hasAnyCommercePermission(permissions, ["commerce.manage_payouts", "commerce.issue_refunds"])).toBe(true)
    expect(hasAllCommercePermissions(permissions, ["commerce.view", "commerce.view_financials"])).toBe(true)
    expect(() => assertAnyCommercePermission(permissions, ["commerce.manage_payouts", "commerce.view_audit"]))
      .not.toThrow()
    expect(requiresHighRiskCommercePermission("commerce.issue_refunds")).toBe(true)
    expect(requiresHighRiskCommercePermission("commerce.view")).toBe(false)
  })

  it("derives a trusted organization-scoped Commerce context from ActingAdminContext", () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view", "commerce.manage_settlements"],
      display: {
        name: "Tourify Commerce",
        timezone: "America/Los_Angeles",
        defaultCurrency: "usd",
      },
    })

    expect(context.actor).toEqual({
      userId: "user-a",
      profileId: "profile-a",
      membershipRole: "finance",
    })
    expect(context.scope).toEqual({
      type: "organization",
      id: "org-a",
      organizationId: "org-a",
    })
    expect(context.display).toEqual({
      name: "Tourify Commerce",
      timezone: "America/Los_Angeles",
      defaultCurrency: "USD",
    })
    expect(context.request).toEqual({
      correlationId: "request-123456",
      source: "header",
    })
    expect(context.admin.capabilities).toEqual(["finance.view", "finance.manage"])
  })

  it("supports child event scope anchored to the verified organization", () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view"],
      scope: {
        type: "event",
        id: "event-a",
        eventId: "event-a",
      },
    })

    expect(context.scope).toEqual({
      type: "event",
      id: "event-a",
      eventId: "event-a",
      organizationId: "org-a",
    })
  })

  it("requires a scope id for every non-platform scope", () => {
    expect(() =>
      createCommerceContextFromAdmin({
        admin: adminContext,
        scope: { type: "seller", id: null },
      }),
    ).toThrow(/scope id/)
  })

  it("checks Commerce permissions without consulting legacy admin capabilities", () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view"],
    })

    expect(hasCommercePermission(context.permissions, "commerce.view")).toBe(true)
    expect(hasCommercePermission(context.permissions, "commerce.manage_payouts")).toBe(false)
    expect(() => assertCommercePermission(context.permissions, "commerce.manage_payouts"))
      .toThrow("Commerce permission denied: commerce.manage_payouts")
  })
})
