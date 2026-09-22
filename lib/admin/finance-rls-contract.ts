/**
 * SEC-106 / FIN-102 — Finance RLS contract (policy names + capabilities).
 */

export const SEC106_FINANCE_TABLES = [
  "financial_transactions",
  "budgets",
  "settlements",
  "financial_audit_log",
] as const

export const SEC106_DROPPED_POLICY_NAMES = [
  "fin_tx_all",
  "budgets_all",
  "settlements_write",
  "settlements_org_isolation",
  "audit_log_select",
] as const

/** FIN-102 — additional legacy policy names dropped if still present. */
export const FIN102_DROPPED_POLICY_NAMES = [
  ...SEC106_DROPPED_POLICY_NAMES,
  "settlements_select",
  "settlements_insert",
  "settlements_update",
  "settlements_delete",
  "financial_transactions_select",
  "financial_transactions_insert",
  "financial_transactions_update",
  "financial_transactions_delete",
  "budgets_select",
  "budgets_insert",
  "budgets_update",
  "budgets_delete",
  "financial_audit_log_select",
  "financial_audit_log_insert",
  "financial_audit_log_update",
  "financial_audit_log_delete",
] as const

export const FIN102_VERIFY_RPC = "admin_verify_fin102_no_blanket_policies"
export const FIN102_POLICY_PREFIX = "sec106_"

export const SEC106_POLICY_PREFIX = "sec106_"

export const SEC106_FINANCE_CAPABILITIES = [
  "finance.view",
  "finance.manage",
  "finance.approve",
  "finance.pay",
] as const

/** Direct-client matrix: org A allow / org B deny for finance tables. */
export interface Fin102RlsCase {
  id: string
  table: (typeof SEC106_FINANCE_TABLES)[number]
  action: "select" | "insert" | "update" | "delete"
  persona: "org_a_finance" | "org_b_finance" | "org_a_viewer_no_finance" | "anonymous"
  targetOrg: "a" | "b"
  expect: "allow" | "deny"
  notes?: string
}

export function buildFin102DirectClientCases(): Fin102RlsCase[] {
  const cases: Fin102RlsCase[] = []
  for (const table of SEC106_FINANCE_TABLES) {
    if (table === "financial_audit_log") {
      cases.push({
        id: `fin102-${table}-org_a-select`,
        table,
        action: "select",
        persona: "org_a_finance",
        targetOrg: "a",
        expect: "allow",
        notes: "Audit is select-only for capability holders",
      })
      cases.push({
        id: `fin102-${table}-org_a-insert-deny`,
        table,
        action: "insert",
        persona: "org_a_finance",
        targetOrg: "a",
        expect: "deny",
        notes: "No authenticated write policies on audit log",
      })
      cases.push({
        id: `fin102-${table}-org_b-select-deny`,
        table,
        action: "select",
        persona: "org_b_finance",
        targetOrg: "a",
        expect: "deny",
      })
      cases.push({
        id: `fin102-${table}-anon-select-deny`,
        table,
        action: "select",
        persona: "anonymous",
        targetOrg: "a",
        expect: "deny",
      })
      continue
    }

    for (const action of ["select", "insert", "update", "delete"] as const) {
      cases.push({
        id: `fin102-${table}-org_a-${action}`,
        table,
        action,
        persona: "org_a_finance",
        targetOrg: "a",
        expect: action === "select" ? "allow" : "allow",
        notes: "Requires can_finance on org A",
      })
      cases.push({
        id: `fin102-${table}-org_b-${action}-cross`,
        table,
        action,
        persona: "org_b_finance",
        targetOrg: "a",
        expect: "deny",
      })
      cases.push({
        id: `fin102-${table}-no_cap-${action}`,
        table,
        action,
        persona: "org_a_viewer_no_finance",
        targetOrg: "a",
        expect: "deny",
      })
      cases.push({
        id: `fin102-${table}-anon-${action}`,
        table,
        action,
        persona: "anonymous",
        targetOrg: "a",
        expect: "deny",
      })
    }
  }
  return cases
}

export function assertFin102DirectClientCoverage(cases: Fin102RlsCase[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  for (const table of SEC106_FINANCE_TABLES) {
    const forTable = cases.filter((c) => c.table === table)
    if (!forTable.some((c) => c.persona === "org_a_finance" && c.expect === "allow"))
      failures.push(`${table}: missing Org A allow case`)
    if (!forTable.some((c) => c.persona === "org_b_finance" && c.expect === "deny"))
      failures.push(`${table}: missing Org B cross-deny case`)
    if (!forTable.some((c) => c.persona === "anonymous" && c.expect === "deny"))
      failures.push(`${table}: missing anonymous deny case`)
  }
  return { ok: failures.length === 0, failures }
}

export function isSec106FinanceTable(tableName: string): boolean {
  return (SEC106_FINANCE_TABLES as readonly string[]).includes(tableName)
}

export function isFin102DroppedPolicy(policyName: string): boolean {
  return (FIN102_DROPPED_POLICY_NAMES as readonly string[]).includes(policyName)
}
