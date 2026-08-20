import {
  hasAnyCommercePermission,
  type CommerceContext,
  type CommercePermission,
} from "@/lib/admin/commerce/context"
import { commerceErrorResponse } from "@/lib/admin/commerce/errors"

export const COMMERCE_HIGH_RISK_ACTIONS = [
  "refund.issue",
  "payout.retry",
  "payout.manage",
  "settlement.manage",
  "fee_rule.write",
  "provider.webhook_exception_mutate",
] as const

export type CommerceHighRiskAction = (typeof COMMERCE_HIGH_RISK_ACTIONS)[number]

export interface CommerceHighRiskActionRequirement {
  action: CommerceHighRiskAction
  requiredAnyPermission: readonly CommercePermission[]
  reasonRequired: boolean
  reasonMinLength: number
  reasonMaxLength: number
  auditRequired: boolean
  providerStateRequired: boolean
}

export interface CommerceHighRiskActionOptions {
  reason?: unknown
}

export interface CommerceFinancialActionReason {
  reason: string
}

const FINANCIAL_ACTION_REASON_MIN_LENGTH = 3
const FINANCIAL_ACTION_REASON_MAX_LENGTH = 1_000

export const COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS: Readonly<
  Record<CommerceHighRiskAction, CommerceHighRiskActionRequirement>
> = {
  "refund.issue": {
    action: "refund.issue",
    requiredAnyPermission: ["commerce.issue_refunds"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: true,
  },
  "payout.retry": {
    action: "payout.retry",
    requiredAnyPermission: ["commerce.retry_payouts", "commerce.manage_payouts"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: true,
  },
  "payout.manage": {
    action: "payout.manage",
    requiredAnyPermission: ["commerce.manage_payouts"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: true,
  },
  "settlement.manage": {
    action: "settlement.manage",
    requiredAnyPermission: ["commerce.manage_settlements"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: false,
  },
  "fee_rule.write": {
    action: "fee_rule.write",
    requiredAnyPermission: ["commerce.manage_fees"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: false,
  },
  "provider.webhook_exception_mutate": {
    action: "provider.webhook_exception_mutate",
    requiredAnyPermission: ["commerce.view_audit"],
    reasonRequired: true,
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
    auditRequired: true,
    providerStateRequired: false,
  },
}

export function canPerformCommerceHighRiskAction(
  context: Pick<CommerceContext, "permissions">,
  action: CommerceHighRiskAction,
): boolean {
  const requirement = COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action]
  return hasAnyCommercePermission(context.permissions, requirement.requiredAnyPermission)
}

export function normalizeCommerceFinancialActionReason(
  value: unknown,
  requirement: Pick<CommerceHighRiskActionRequirement, "reasonMinLength" | "reasonMaxLength"> = {
    reasonMinLength: FINANCIAL_ACTION_REASON_MIN_LENGTH,
    reasonMaxLength: FINANCIAL_ACTION_REASON_MAX_LENGTH,
  },
): CommerceFinancialActionReason {
  if (typeof value !== "string") {
    throw new Error("commerce_financial_action_reason_required")
  }
  const reason = value.trim()
  if (reason.length < requirement.reasonMinLength) {
    throw new Error("commerce_financial_action_reason_required")
  }
  if (reason.length > requirement.reasonMaxLength) {
    throw new Error("commerce_financial_action_reason_too_long")
  }
  return { reason }
}

function requireCommerceFinancialActionReason(
  context: Pick<CommerceContext, "request">,
  action: CommerceHighRiskAction,
  reason: unknown,
): ReturnType<typeof commerceErrorResponse> | null {
  const requirement = COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action]
  if (!requirement.reasonRequired) return null

  try {
    normalizeCommerceFinancialActionReason(reason, requirement)
    return null
  } catch (error) {
    const code = error instanceof Error
      ? error.message
      : "commerce_financial_action_reason_required"
    return commerceErrorResponse({
      status: 400,
      code,
      message: code === "commerce_financial_action_reason_too_long"
        ? "Financial action reason is too long."
        : "Financial action reason is required.",
      correlationId: context.request.correlationId,
      details: {
        action,
        minLength: requirement.reasonMinLength,
        maxLength: requirement.reasonMaxLength,
      },
    })
  }
}

export function requireCommerceHighRiskAction(
  context: Pick<CommerceContext, "permissions" | "request">,
  action: CommerceHighRiskAction,
  options: CommerceHighRiskActionOptions = {},
): ReturnType<typeof commerceErrorResponse> | null {
  if (canPerformCommerceHighRiskAction(context, action)) {
    return requireCommerceFinancialActionReason(context, action, options.reason)
  }

  const requirement = COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action]
  return commerceErrorResponse({
    status: 403,
    code: "commerce_high_risk_permission_denied",
    message: "High-risk Commerce action permission denied.",
    correlationId: context.request.correlationId,
    details: {
      action,
      requiredAnyPermission: [...requirement.requiredAnyPermission],
    },
  })
}

export function assertCommerceHighRiskAction(
  context: Pick<CommerceContext, "permissions">,
  action: CommerceHighRiskAction,
  options: CommerceHighRiskActionOptions = {},
): void {
  if (!canPerformCommerceHighRiskAction(context, action)) {
    const requirement = COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action]
    throw new Error(`Commerce high-risk action denied: ${action} requires one of ${requirement.requiredAnyPermission.join(", ")}`)
  }
  if (COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action].reasonRequired) {
    normalizeCommerceFinancialActionReason(options.reason, COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS[action])
  }
}
