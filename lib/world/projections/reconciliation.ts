/**
 * P3-T10 — projection reconciliation (pure, deterministic).
 *
 * Compares the open facts currently stored against a fresh desired set
 * produced by a projector scan, and plans retirement of stale relations.
 *
 * Guarantees:
 * - Historical evidence is NEVER deleted: stale facts retire via
 *   `valid_until = retiredAt`, preserving the row forever.
 * - Same inputs ⇒ identical plan (idempotent; safe to re-run).
 * - Facts whose identity matches the desired set are kept untouched —
 *   even if projector_version differs (version drift is reported, not acted on,
 *   so re-projection owns upgrades).
 */

export interface StoredOpenFact {
  id: string
  entity_table: string
  entity_id: string
  place_id: string
  relation_key: string
  projector_version: string
}

export interface DesiredFact {
  entity_table: string
  entity_id: string
  place_id: string
  relation_key: string
}

export interface ReconciliationPlan {
  /** Open facts no longer produced by the source scan → retire via valid_until. */
  toRetire: Array<{
    factId: string
    entity_table: string
    entity_id: string
    place_id: string
    relation_key: string
    reason: "absent_from_source_scan"
  }>
  /** Identity-matching facts left alone. */
  kept: number
  /** Desired facts with no stored row yet — the projector's upsert covers these; listed for transparency. */
  toCreate: DesiredFact[]
}

function identity(f: { entity_table: string; entity_id: string; place_id: string; relation_key: string }): string {
  return `${f.entity_table}|${f.entity_id}|${f.place_id}|${f.relation_key}`
}

/**
 * Plan reconciliation between stored open facts and the fresh desired set.
 * Deterministic output ordering: toRetire sorted by factId, toCreate sorted
 * by identity.
 */
export function planReconciliation(
  storedOpenFacts: readonly StoredOpenFact[],
  desiredFacts: readonly DesiredFact[],
): ReconciliationPlan {
  const desiredByIdentity = new Map<string, DesiredFact>()
  for (const desired of desiredFacts) {
    desiredByIdentity.set(identity(desired), desired)
  }

  const toRetire: ReconciliationPlan["toRetire"] = []
  let kept = 0
  for (const fact of [...storedOpenFacts].sort((a, b) => a.id.localeCompare(b.id))) {
    if (desiredByIdentity.has(identity(fact))) {
      kept += 1
    } else {
      toRetire.push({
        factId: fact.id,
        entity_table: fact.entity_table,
        entity_id: fact.entity_id,
        place_id: fact.place_id,
        relation_key: fact.relation_key,
        reason: "absent_from_source_scan",
      })
    }
  }

  const storedIdentities = new Set(storedOpenFacts.map(identity))
  const toCreate = desiredFacts
    .filter((d) => !storedIdentities.has(identity(d)))
    .sort((a, b) => identity(a).localeCompare(identity(b)))

  return { toRetire, kept, toCreate }
}

/**
 * The write payload for retiring one fact. `valid_until` closes the fact
 * while the partial unique index (valid_until IS NULL) frees the identity
 * slot for future re-projection. Row remains as historical evidence.
 */
export function retirementPatch(retiredAtIso: string): { valid_until: string } {
  return { valid_until: retiredAtIso }
}
