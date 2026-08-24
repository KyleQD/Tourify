/**
 * P3 — Entity→Place fact projector (deterministic stages:
 * scan → resolve → upsert/retire → report).
 *
 * Idempotency: upsert keyed on (entity_table, entity_id, place_id,
 * relation_key) open fact. Ambiguity/unresolved fail closed into review
 * candidates. Retired records keep history via valid_until.
 */
import type {
  FactStore,
  ProjectorReport,
  ScanRecord,
  WorldProjectorDeps,
} from "./types"
import { PROJECTOR_VERSION } from "./types"

export async function runProjector(
  records: ScanRecord[],
  deps: WorldProjectorDeps,
): Promise<ProjectorReport> {
  const now = deps.now ?? (() => new Date())
  const report: ProjectorReport = {
    scanned: 0,
    resolved: 0,
    ambiguous: 0,
    unresolved: 0,
    upserted: 0,
    retired: 0,
    errors: 0,
  }

  for (const record of records) {
    report.scanned += 1
    try {
      const resolution = await deps.resolvePlace(record)
      const { domain, key } = deps.relationFor(record.entityKind)

      if (resolution.status === "resolved") {
        const existing = await deps.store.findOpenFact(
          record.entityTable,
          record.entityId,
          resolution.placeId,
          key,
        )
        if (existing) {
          await deps.store.updateFact(existing.id, {
            confidence: resolution.confidence,
            projectorVersion: PROJECTOR_VERSION,
          })
        } else {
          await deps.store.insertFact({
            entityKind: record.entityKind,
            entityTable: record.entityTable,
            entityId: record.entityId,
            placeId: resolution.placeId,
            relationDomain: domain,
            relationKey: key,
            confidence: resolution.confidence,
            visibility: "internal",
            projectorVersion: PROJECTOR_VERSION,
          })
          report.upserted += 1
        }
        report.resolved += 1

        // Retire any OTHER open fact for the same entity+relation when the
        // canonical place changed (move semantics; history preserved).
        const stale = await deps.store.findStaleFacts?.(
          record.entityTable,
          record.entityId,
          key,
          resolution.placeId,
        )
        if (stale) for (const id of stale) { await deps.store.retireFact(id); report.retired += 1 }
      } else if (resolution.status === "ambiguous") {
        report.ambiguous += 1
        const existingCandidate = await deps.store.findReviewCandidate(
          record.entityTable,
          record.entityId,
          "ambiguous",
        )
        if (!existingCandidate) {
          await deps.store.insertReviewCandidate({
            entityKind: record.entityKind,
            entityTable: record.entityTable,
            entityId: record.entityId,
            reason: "ambiguous",
            placeIds: resolution.placeIds,
          })
        }
      } else {
        report.unresolved += 1
      }
    } catch {
      // One failed record never aborts the run (spec §11), but it counts.
      report.errors += 1
    }
  }
  void now
  return report
}
