/**
 * P3-T10 — reconciliation planning tests: stale detection, history
 * preservation, idempotency, no-delete guarantee.
 */
import { describe, expect, it } from "vitest"

import {
  planReconciliation,
  retirementPatch,
  type StoredOpenFact,
} from "@/lib/world/projections/reconciliation"

function stored(id: string, entityId: string): StoredOpenFact {
  return {
    id,
    entity_table: "venues_v2",
    entity_id: entityId,
    place_id: "place-detroit",
    relation_key: "located_in",
    projector_version: "v1.0",
  }
}

describe("P3-T10 planReconciliation", () => {
  const desired = [
    { entity_table: "venues_v2", entity_id: "v1", place_id: "place-detroit", relation_key: "located_in" },
    { entity_table: "venues_v2", entity_id: "v2", place_id: "place-detroit", relation_key: "located_in" },
  ]

  it("keeps identity-matching facts and retires absent ones via valid_until", () => {
    const plan = planReconciliation(
      [stored("f-keep", "v1"), stored("f-stale", "v-gone")],
      desired,
    )
    expect(plan.kept).toBe(1)
    expect(plan.toRetire).toHaveLength(1)
    expect(plan.toRetire[0]).toMatchObject({
      factId: "f-stale",
      reason: "absent_from_source_scan",
    })
    expect(plan.toCreate.map((d) => d.entity_id)).toEqual(["v2"])
  })

  it("is idempotent — same inputs give the same plan; post-apply state gives empty retirements", () => {
    const facts = [stored("f-1", "v1"), stored("f-2", "v-gone")]
    const first = planReconciliation(facts, desired)
    expect(first).toEqual(planReconciliation(facts, desired))
    // After applying, the retired fact is no longer open ⇒ nothing to retire.
    const afterApply = planReconciliation([stored("f-1", "v1")], desired)
    expect(afterApply.toRetire).toHaveLength(0)
    expect(afterApply.kept).toBe(1)
  })

  it("retirement patch stamps valid_until — the row is closed, never deleted", () => {
    const patch = retirementPatch("2026-08-23T00:00:00Z")
    expect(patch).toEqual({ valid_until: "2026-08-23T00:00:00Z" })
    // The open-fact partial unique index only covers valid_until IS NULL, so
    // stamping frees the identity slot while preserving history.
  })

  it("reports version drift as transparency without acting on it", () => {
    const drifted: StoredOpenFact[] = [{ ...stored("f-1", "v1"), projector_version: "v0.9-ancient" }]
    const plan = planReconciliation(drifted, desired.slice(0, 1))
    // Identity matches ⇒ kept even though the producing projector differs;
    // upgrades belong to re-projection, not reconciliation.
    expect(plan.kept).toBe(1)
    expect(plan.toRetire).toHaveLength(0)
  })
})
