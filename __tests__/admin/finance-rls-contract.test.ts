import { describe, expect, it } from "vitest"
import {
  assertFin102DirectClientCoverage,
  buildFin102DirectClientCases,
  FIN102_DROPPED_POLICY_NAMES,
  FIN102_VERIFY_RPC,
  isFin102DroppedPolicy,
  isSec106FinanceTable,
  SEC106_DROPPED_POLICY_NAMES,
  SEC106_FINANCE_CAPABILITIES,
  SEC106_FINANCE_TABLES,
  SEC106_POLICY_PREFIX,
} from "@/lib/admin/finance-rls-contract"

describe("SEC-106 / FIN-102 finance RLS contract", () => {
  it("covers core finance tables", () => {
    expect(SEC106_FINANCE_TABLES).toEqual([
      "financial_transactions",
      "budgets",
      "settlements",
      "financial_audit_log",
    ])
  })

  it("lists blanket policies that must be dropped", () => {
    expect(SEC106_DROPPED_POLICY_NAMES).toContain("fin_tx_all")
    expect(SEC106_DROPPED_POLICY_NAMES).toContain("budgets_all")
    expect(SEC106_DROPPED_POLICY_NAMES).toContain("settlements_write")
    expect(FIN102_DROPPED_POLICY_NAMES).toContain("financial_transactions_select")
    expect(isFin102DroppedPolicy("fin_tx_all")).toBe(true)
    expect(FIN102_VERIFY_RPC).toBe("admin_verify_fin102_no_blanket_policies")
  })

  it("uses sec106_ policy prefix and finance capabilities", () => {
    expect(SEC106_POLICY_PREFIX).toBe("sec106_")
    expect(SEC106_FINANCE_CAPABILITIES).toContain("finance.view")
    expect(SEC106_FINANCE_CAPABILITIES).toContain("finance.pay")
  })

  it("guards table membership helper", () => {
    expect(isSec106FinanceTable("budgets")).toBe(true)
    expect(isSec106FinanceTable("ticket_types")).toBe(false)
  })

  it("builds Org A allow / Org B deny direct-client cases", () => {
    const cases = buildFin102DirectClientCases()
    const coverage = assertFin102DirectClientCoverage(cases)
    expect(coverage.ok).toBe(true)
    expect(cases.some((c) => c.persona === "anonymous" && c.expect === "deny")).toBe(true)
    expect(
      cases.some(
        (c) =>
          c.table === "financial_audit_log"
          && c.action === "insert"
          && c.expect === "deny",
      ),
    ).toBe(true)
  })
})

