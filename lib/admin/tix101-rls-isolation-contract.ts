/**
 * TIX-101 — Drop permissive legacy ticketing policies + Org A/B isolation contract.
 * Builds on SEC-108 drops; adds parent/record-ID isolation cases for CI.
 */

import { SEC108_DROPPED_PERMISSIVE_POLICIES } from "@/lib/admin/legacy-ticketing-rls-contract"
import type { RlsMatrixCase, RlsPersona } from "@/lib/testing/rls-persona-matrix"

export const TIX101_VERIFY_RPC = "admin_verify_tix101_no_blanket_policies"

export const TIX101_DROPPED_POLICIES = [
  ...SEC108_DROPPED_PERMISSIVE_POLICIES,
  "ticket_analytics_events_insert",
] as const

/** Tables that must isolate by events_v2.org_id (parent) and record id. */
export const TIX101_ISOLATION_TABLES = [
  "ticket_types",
  "ticket_sales",
  "tickets",
  "ticket_campaigns",
  "promo_codes",
  "event_ticketing_config",
] as const

export type Tix101IsolationTable = (typeof TIX101_ISOLATION_TABLES)[number]

export const TIX101_PARENT_CHAIN = {
  parent: "events_v2",
  parentKey: "org_id",
  childFk: "event_id",
} as const

export interface Tix101IsolationCase extends RlsMatrixCase {
  isolation: "parent_org" | "record_id"
}

/** Org A owner may read Org A rows; must deny Org B by parent org and guessed record id. */
export function buildTix101OrgIsolationCases(): Tix101IsolationCase[] {
  const cases: Tix101IsolationCase[] = []
  const personas: Array<{ persona: RlsPersona; allowOnA: boolean }> = [
    { persona: "org_a_owner", allowOnA: true },
    { persona: "org_a_manager", allowOnA: true },
    { persona: "org_b_owner", allowOnA: false },
    { persona: "anonymous", allowOnA: false },
  ]

  for (const table of TIX101_ISOLATION_TABLES) {
    for (const { persona, allowOnA } of personas) {
      cases.push({
        id: `tix101-${table}-${persona}-select-a-parent`,
        table,
        action: "select",
        persona,
        targetOrg: "a",
        expect: allowOnA ? "allow" : "deny",
        isolation: "parent_org",
        notes: `Parent chain ${TIX101_PARENT_CHAIN.parent}.${TIX101_PARENT_CHAIN.parentKey}`,
      })
      cases.push({
        id: `tix101-${table}-${persona}-select-b-record`,
        table,
        action: "select",
        persona,
        targetOrg: "b",
        expect: "deny",
        isolation: "record_id",
        notes: "Guessing foreign record UUID must not leak",
      })
    }
  }

  return cases
}

export function assertTix101IsolationCoverage(cases: Tix101IsolationCase[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  for (const table of TIX101_ISOLATION_TABLES) {
    const forTable = cases.filter((c) => c.table === table)
    if (!forTable.some((c) => c.isolation === "parent_org"))
      failures.push(`${table}: missing parent_org isolation case`)
    if (!forTable.some((c) => c.isolation === "record_id" && c.expect === "deny"))
      failures.push(`${table}: missing record_id deny case`)
    if (!forTable.some((c) => c.persona === "org_a_owner" && c.targetOrg === "a" && c.expect === "allow"))
      failures.push(`${table}: missing Org A allow case`)
    if (!forTable.some((c) => c.persona === "org_b_owner" && c.targetOrg === "a" && c.expect === "deny"))
      failures.push(`${table}: missing Org B cross-deny case`)
  }
  return { ok: failures.length === 0, failures }
}

export function isTix101DroppedPolicy(policyName: string): boolean {
  return (TIX101_DROPPED_POLICIES as readonly string[]).includes(policyName)
}
