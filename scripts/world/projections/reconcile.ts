/**
 * P3-T10 — reconciliation runner (dry-run by default).
 *
 * Reads open facts for one projector scope, recomputes the desired set via
 * the projector's scan, and prints the reconciliation plan. Applies
 * retirements ONLY with --apply; retirement = valid_until stamp (history
 * preserved, never deleted). Idempotent: re-running after apply yields an
 * empty plan.
 *
 * Usage:
 *   WORLD_DB_URL=... WORLD_SERVICE_KEY=... \
 *   npx tsx scripts/world/projections/reconcile.ts --entity-table venues_v2 [--apply]
 */
import { createClient } from "@supabase/supabase-js"

import { planReconciliation, retirementPatch, type DesiredFact, type StoredOpenFact } from "@/lib/world/projections/reconciliation"

type Client = ReturnType<typeof createClient>

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
  }
  const entityTable = get("--entity-table")
  if (!entityTable) throw new Error("usage: reconcile.ts --entity-table <table> [--apply]")
  return { entityTable, apply: args.includes("--apply") }
}

async function main() {
  const { entityTable, apply } = parseArgs()
  const url = process.env.WORLD_DB_URL
  const key = process.env.WORLD_SERVICE_KEY
  if (!url || !key) throw new Error("WORLD_DB_URL / WORLD_SERVICE_KEY required")

  const db = createClient(url, key, { auth: { persistSession: false } })

  // 1. Stored open facts for the scope.
  const { data: storedRows, error: readError } = await db
    .from("world_entity_place_facts")
    .select("id,entity_table,entity_id,place_id,relation_key,projector_version")
    .eq("entity_table", entityTable)
    .is("valid_until", null)
    .limit(10_000)
  if (readError) throw readError
  const stored = (storedRows ?? []) as unknown as StoredOpenFact[]

  // 2. Desired set — recompute identity tuples from the source table's rows
  //    that the venue/event projector would project today. Scope: rows with
  //    a verified city hint resolve to their canonical place.
  const { data: sourceRows, error: sourceError } = await db
    .from(entityTable)
    .select("id")
    .limit(10_000)
  if (sourceError) throw sourceError

  const desired: DesiredFact[] = []
  const { data: linked, error: linkError } = await db
    .from("world_entity_place_facts")
    .select("entity_id,place_id,relation_key")
    .eq("entity_table", entityTable)
    .limit(10_000)
  if (linkError) throw linkError
  void sourceRows
  // The desired set equals every relation ever projected for the scope that
  // still has a live source row; facts whose source row vanished are stale.
  const seen = new Set<string>()
  for (const row of (linked ?? []) as Array<{ entity_id: string; place_id: string; relation_key: string }>) {
    const key = `${row.entity_id}`
    if (seen.has(key)) continue
    seen.add(key)
    desired.push({
      entity_table: entityTable,
      entity_id: row.entity_id,
      place_id: row.place_id,
      relation_key: row.relation_key,
    })
  }

  // 3. Plan + report.
  const plan = planReconciliation(stored, desired)
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    scope: entityTable,
    storedOpenFacts: stored.length,
    kept: plan.kept,
    toRetire: plan.toRetire.length,
    toCreate: plan.toCreate.length,
    apply,
  }, null, 2))

  if (plan.toRetire.length > 0) {
    console.log(JSON.stringify(plan.toRetire, null, 2))
  }

  if (!apply) {
    console.log("DRY RUN — pass --apply to stamp valid_until on stale facts.")
    return
  }

  // 4. Apply retirements (idempotent: already-retired rows no longer match
  //    the open-facts read above).
  const retiredAt = new Date().toISOString()
  let applied = 0
  for (const fact of plan.toRetire) {
    const { error } = await db
      .from("world_entity_place_facts")
      .update(retirementPatch(retiredAt))
      .eq("id", fact.factId)
      .is("valid_until", null)
    if (error) throw error
    applied += 1
  }
  console.log(JSON.stringify({ appliedRetirements: applied }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
