/**
 * FIN-101 — Finance/budget/settlement org-key contract.
 * Parents keyed in SEC-105/SEC-106; this task validates scope, quarantines
 * unresolved/mismatch rows, and verifies counts/consistency.
 */

import { TENANT_KEY_QUARANTINE_REASONS } from "@/lib/admin/tenant-key-quarantine"
import { SEC106_FINANCE_TABLES } from "@/lib/admin/finance-rls-contract"

export const FIN101_VERIFY_RPC = "admin_verify_finance_org_keys"

/** Operational finance parents (org-scoped). */
export const FIN101_PARENT_TABLES = [
  "financial_transactions",
  "budgets",
  "settlements",
] as const

/** Child / satellite tables scoped from parents. */
export const FIN101_CHILD_TABLES = [
  "financial_audit_log",
  "event_expenses",
] as const

export const FIN101_SCOPED_TABLES = [
  ...FIN101_PARENT_TABLES,
  ...FIN101_CHILD_TABLES,
] as const

export type Fin101ParentTable = (typeof FIN101_PARENT_TABLES)[number]
export type Fin101ChildTable = (typeof FIN101_CHILD_TABLES)[number]
export type Fin101ScopedTable = (typeof FIN101_SCOPED_TABLES)[number]

export interface Fin101ParentLink {
  table: Fin101ScopedTable
  /** Optional parent entity for org inheritance / consistency. */
  eventFk?: "event_id"
  tourFk?: "tour_id"
  transactionFk?: "transaction_id"
  notes?: string
}

export const FIN101_PARENT_LINKS: Fin101ParentLink[] = [
  {
    table: "financial_transactions",
    eventFk: "event_id",
    tourFk: "tour_id",
    notes: "org_id required; event/tour org must match",
  },
  {
    table: "budgets",
    eventFk: "event_id",
    tourFk: "tour_id",
    notes: "Backfill from event then tour; null → quarantine",
  },
  {
    table: "settlements",
    eventFk: "event_id",
    tourFk: "tour_id",
    notes: "org_id required; event/tour org must match",
  },
  {
    table: "financial_audit_log",
    transactionFk: "transaction_id",
    notes: "Child of financial_transactions",
  },
  {
    table: "event_expenses",
    eventFk: "event_id",
    notes: "Legacy archive table if present; never invent org_id",
  },
]

export const FIN101_QUARANTINE_REASONS = [
  TENANT_KEY_QUARANTINE_REASONS.unresolvableAfterBackfill,
  TENANT_KEY_QUARANTINE_REASONS.missingOrganizationRow,
  TENANT_KEY_QUARANTINE_REASONS.parentOrgMismatch,
] as const

export const FIN101_RESTRICTIVE_POLICIES = [
  "fin101_require_org_id",
  "fin101_deny_quarantined",
] as const

export function isFin101ScopedTable(tableName: string): tableName is Fin101ScopedTable {
  return (FIN101_SCOPED_TABLES as readonly string[]).includes(tableName)
}

export function isFin101ParentTable(tableName: string): tableName is Fin101ParentTable {
  return (FIN101_PARENT_TABLES as readonly string[]).includes(tableName)
}

export interface FinanceOrgKeyVerificationRow {
  table_name: string
  total_rows: number
  keyed_rows: number
  null_org_rows: number
  quarantine_open: number
  parent_mismatch_rows: number
}

/**
 * After FIN-101 apply: null_org on nullable tables should be quarantined;
 * parent_mismatch_rows should equal open quarantine entries for that reason
 * (or zero once resolved). We require parent_mismatch_rows === 0 for green AC
 * in CI structural checks when feeding synthetic clean rows.
 */
export function assertFinanceOrgKeyVerification(rows: FinanceOrgKeyVerificationRow[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  const byTable = new Map(rows.map((row) => [row.table_name, row]))

  for (const table of FIN101_SCOPED_TABLES) {
    const row = byTable.get(table)
    if (!row) continue

    if (row.null_org_rows > row.quarantine_open) {
      failures.push(
        `${table}: null_org_rows=${row.null_org_rows} exceeds quarantine_open=${row.quarantine_open}`,
      )
    }
    if (row.parent_mismatch_rows > 0) {
      failures.push(
        `${table}: parent_mismatch_rows=${row.parent_mismatch_rows} (must be quarantined/inaccessible)`,
      )
    }
    if (row.keyed_rows + row.null_org_rows !== row.total_rows) {
      failures.push(
        `${table}: keyed+null (${row.keyed_rows}+${row.null_org_rows}) != total ${row.total_rows}`,
      )
    }
  }

  for (const table of SEC106_FINANCE_TABLES) {
    if (!isFin101ScopedTable(table))
      failures.push(`SEC-106 table ${table} missing from FIN-101 scope`)
  }

  return { ok: failures.length === 0, failures }
}

/** Stamp acting org on finance writes (never invent from client body). */
export function stampFinanceOrgId<T extends Record<string, unknown>>(args: {
  row: T
  orgId: string
}): T & { org_id: string } {
  const { org_id: _ignored, ...rest } = args.row
  return { ...rest, org_id: args.orgId } as T & { org_id: string }
}
