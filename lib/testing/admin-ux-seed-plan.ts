import { createHash } from "node:crypto"

import {
  assertIsolatedFixtureTarget,
  buildAdminFeatureScenario,
  type ScenarioDatabaseRow,
} from "@/lib/testing/admin-feature-scenarios"

export interface AdminUxSeedOperation {
  table: string
  conflictTarget: "id"
  rows: ScenarioDatabaseRow[]
}

export interface AdminUxSeedPlan {
  target: string
  mode: "deterministic_upsert_plan"
  operations: AdminUxSeedOperation[]
  fingerprint: string
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export function buildAdminUxSeedPlan(target: string): AdminUxSeedPlan {
  assertIsolatedFixtureTarget(target)
  const scenarios = (["a", "b"] as const).map((org) =>
    buildAdminFeatureScenario({ kind: "realistic", org }),
  )
  const byTable = new Map<string, ScenarioDatabaseRow[]>()

  const appendRows = (table: string, rows: ScenarioDatabaseRow[]) => {
    const rowsById = new Map(
      (byTable.get(table) ?? []).map((row) => [String(row.id), row]),
    )
    for (const row of rows) rowsById.set(String(row.id), row)
    byTable.set(table, [...rowsById.values()])
  }

  for (const scenario of scenarios) {
    for (const domain of scenario.domains) {
      if (!domain.persisted) continue
      appendRows(domain.parentTable, domain.parents)
      appendRows(domain.childTable, domain.children)
    }
  }

  const operations = [...byTable.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([table, rows]) => ({ table, conflictTarget: "id" as const, rows }))
  const fingerprint = createHash("sha256").update(stableJson(operations)).digest("hex")

  return { target, mode: "deterministic_upsert_plan", operations, fingerprint }
}
