import { NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import {
  assertCommerceHighRiskAction,
  canPerformCommerceHighRiskAction,
  COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS,
  normalizeCommerceFinancialActionReason,
  requireCommerceHighRiskAction,
} from "@/lib/admin/commerce/high-risk-actions"
import { createCommerceContextFromAdmin } from "@/lib/admin/commerce/context"
import type { ActingAdminContext } from "@/lib/auth/admin-context"

const adminContext: ActingAdminContext = {
  userId: "user-a",
  profileId: "profile-a",
  accountType: "organization",
  orgId: "org-a",
  membershipRole: "finance",
  capabilities: ["finance.view"],
  source: "header",
  scope: "organization",
  allowedTourIds: [],
  correlationId: "request-highrisk",
}

describe("COM-029 Commerce high-risk action checks", () => {
  it("defines explicit permission requirements for risky Commerce mutations", () => {
    expect(COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS["payout.retry"]).toMatchObject({
      requiredAnyPermission: ["commerce.retry_payouts", "commerce.manage_payouts"],
      reasonRequired: true,
      auditRequired: true,
      providerStateRequired: true,
    })
    expect(COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS["fee_rule.write"]).toMatchObject({
      requiredAnyPermission: ["commerce.manage_fees"],
      reasonRequired: true,
      auditRequired: true,
      providerStateRequired: false,
    })
  })

  it("allows high-risk actions when the context has any required permission", () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.manage_payouts"],
    })

    expect(canPerformCommerceHighRiskAction(context, "payout.retry")).toBe(true)
    expect(requireCommerceHighRiskAction(context, "payout.retry", { reason: "Retry after provider outage cleared" })).toBeNull()
    expect(() => assertCommerceHighRiskAction(context, "payout.retry", { reason: "Retry after provider outage cleared" })).not.toThrow()
  })

  it("returns a structured denial with correlation id when permissions are absent", async () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view"],
    })

    const response = requireCommerceHighRiskAction(context, "payout.retry")
    expect(response).toBeInstanceOf(NextResponse)
    expect(response?.status).toBe(403)
    expect(response?.headers.get("x-correlation-id")).toBe("request-highrisk")
    await expect(response?.json()).resolves.toMatchObject({
      error: {
        code: "commerce_high_risk_permission_denied",
        retryable: false,
        details: {
          action: "payout.retry",
          requiredAnyPermission: ["commerce.retry_payouts", "commerce.manage_payouts"],
        },
      },
      correlationId: "request-highrisk",
    })
    expect(() => assertCommerceHighRiskAction(context, "payout.retry"))
      .toThrow(/Commerce high-risk action denied/)
  })

  it("requires normalized reason text for permitted high-risk financial actions", async () => {
    const context = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.manage_payouts"],
    })

    expect(normalizeCommerceFinancialActionReason("  Provider state checked  ")).toEqual({
      reason: "Provider state checked",
    })

    const response = requireCommerceHighRiskAction(context, "payout.retry")
    expect(response).toBeInstanceOf(NextResponse)
    expect(response?.status).toBe(400)
    await expect(response?.json()).resolves.toMatchObject({
      error: {
        code: "commerce_financial_action_reason_required",
        details: {
          action: "payout.retry",
          minLength: 3,
          maxLength: 1000,
        },
      },
      correlationId: "request-highrisk",
    })

    expect(() => assertCommerceHighRiskAction(context, "payout.retry"))
      .toThrow("commerce_financial_action_reason_required")
  })
})
