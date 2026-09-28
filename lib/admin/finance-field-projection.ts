/**
 * FIN-102 — Narrower projection for protected payment/person fields.
 * finance.view sees redacted values; manage/pay/approve see full.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

/** Fields withheld from finance.view-only callers. */
export const FINANCE_PROTECTED_TRANSACTION_FIELDS = [
  "payment_reference",
  "payment_method",
  "vendor_name",
  "receipt_url",
] as const

export type FinanceProtectedTransactionField =
  (typeof FINANCE_PROTECTED_TRANSACTION_FIELDS)[number]

export function canViewFinanceProtectedFields(
  capabilities: readonly AdminCapability[],
): boolean {
  return (
    hasAdminCapability(capabilities, "finance.manage")
    || hasAdminCapability(capabilities, "finance.pay")
    || hasAdminCapability(capabilities, "finance.approve")
  )
}

export function projectFinanceTransactionRow<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  if (canViewFinanceProtectedFields(args.capabilities)) return args.row

  const next = { ...args.row } as Record<string, unknown>
  for (const field of FINANCE_PROTECTED_TRANSACTION_FIELDS) {
    if (field in next && next[field] != null) next[field] = null
  }
  return next as T
}

export function projectFinanceTransactionRows<T extends Record<string, unknown>>(args: {
  rows: T[]
  capabilities: readonly AdminCapability[]
}): T[] {
  return args.rows.map((row) =>
    projectFinanceTransactionRow({ row, capabilities: args.capabilities }),
  )
}
