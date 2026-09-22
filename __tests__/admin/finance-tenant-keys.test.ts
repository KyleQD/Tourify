import { describe, expect, it } from "vitest"

import { SEC106_FINANCE_TABLES } from "@/lib/admin/finance-rls-contract"
import {
  assertFinanceOrgKeyVerification,
  FIN101_CHILD_TABLES,
  FIN101_PARENT_LINKS,
  FIN101_PARENT_TABLES,
  FIN101_QUARANTINE_REASONS,
  FIN101_RESTRICTIVE_POLICIES,
  FIN101_SCOPED_TABLES,
  FIN101_VERIFY_RPC,
  isFin101ParentTable,
  isFin101ScopedTable,
  stampFinanceOrgId,
} from "@/lib/admin/finance-tenant-keys"
import { TENANT_KEY_QUARANTINE_REASONS } from "@/lib/admin/tenant-key-quarantine"

describe("FIN-101 finance tenant keys", () => {
  it("scopes SEC-106 finance tables plus legacy event_expenses", () => {
    for (const table of SEC106_FINANCE_TABLES)
      expect(FIN101_SCOPED_TABLES).toContain(table)
    expect(FIN101_PARENT_TABLES).toEqual(
      expect.arrayContaining(["financial_transactions", "budgets", "settlements"]),
    )
    expect(FIN101_CHILD_TABLES).toContain("financial_audit_log")
    expect(FIN101_VERIFY_RPC).toBe("admin_verify_finance_org_keys")
  })

  it("maps every scoped table to a parent link", () => {
    const linked = new Set(FIN101_PARENT_LINKS.map((link) => link.table))
    for (const table of FIN101_SCOPED_TABLES) expect(linked.has(table)).toBe(true)
  })

  it("documents quarantine reasons and restrictive policies", () => {
    expect(FIN101_QUARANTINE_REASONS).toContain(
      TENANT_KEY_QUARANTINE_REASONS.parentOrgMismatch,
    )
    expect(FIN101_RESTRICTIVE_POLICIES).toEqual(
      expect.arrayContaining(["fin101_require_org_id", "fin101_deny_quarantined"]),
    )
  })

  it("stamps acting org and strips client org_id", () => {
    const stamped = stampFinanceOrgId({
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      row: { category: "travel", org_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
    })
    expect(stamped.org_id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    expect(stamped.category).toBe("travel")
  })

  it("verifies clean keyed rows and rejects parent mismatches", () => {
    const ok = assertFinanceOrgKeyVerification([
      {
        table_name: "financial_transactions",
        total_rows: 10,
        keyed_rows: 10,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 0,
      },
      {
        table_name: "budgets",
        total_rows: 4,
        keyed_rows: 3,
        null_org_rows: 1,
        quarantine_open: 1,
        parent_mismatch_rows: 0,
      },
      {
        table_name: "settlements",
        total_rows: 2,
        keyed_rows: 2,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 0,
      },
      {
        table_name: "financial_audit_log",
        total_rows: 5,
        keyed_rows: 5,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 0,
      },
    ])
    expect(ok.ok).toBe(true)

    const bad = assertFinanceOrgKeyVerification([
      {
        table_name: "settlements",
        total_rows: 2,
        keyed_rows: 2,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 1,
      },
    ])
    expect(bad.ok).toBe(false)
    expect(isFin101ScopedTable("budgets")).toBe(true)
    expect(isFin101ParentTable("financial_audit_log")).toBe(false)
  })
})
