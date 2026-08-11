import { describe, expect, it } from "vitest"

import {
  canViewFinanceProtectedFields,
  FINANCE_PROTECTED_TRANSACTION_FIELDS,
  projectFinanceTransactionRow,
} from "@/lib/admin/finance-field-projection"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

describe("FIN-102 finance field projection", () => {
  const row = {
    id: "1",
    amount: 100,
    payment_reference: "pi_secret",
    payment_method: "card",
    vendor_name: "Acme LLC",
    receipt_url: "https://example.com/r.pdf",
  }

  it("lists protected payment/person fields", () => {
    expect(FINANCE_PROTECTED_TRANSACTION_FIELDS).toEqual(
      expect.arrayContaining([
        "payment_reference",
        "payment_method",
        "vendor_name",
        "receipt_url",
      ]),
    )
  })

  it("redacts protected fields for finance.view only", () => {
    const caps = ["finance.view"] as AdminCapability[]
    expect(canViewFinanceProtectedFields(caps)).toBe(false)
    const projected = projectFinanceTransactionRow({ row, capabilities: caps })
    expect(projected.amount).toBe(100)
    expect(projected.payment_reference).toBeNull()
    expect(projected.vendor_name).toBeNull()
    expect(projected.receipt_url).toBeNull()
  })

  it("keeps protected fields for manage/pay", () => {
    for (const cap of ["finance.manage", "finance.pay"] as AdminCapability[]) {
      const projected = projectFinanceTransactionRow({
        row,
        capabilities: [cap],
      })
      expect(projected.payment_reference).toBe("pi_secret")
      expect(projected.vendor_name).toBe("Acme LLC")
    }
  })
})
