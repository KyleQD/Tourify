/**
 * P14-T09 — optimistic concurrency guards.
 *
 * Every editorial mutation carries the version the reviewer saw. If the
 * stored row has moved on, the write fails closed with a typed conflict so
 * reviewers never silently overwrite each other.
 */

export class WorldConcurrencyConflictError extends Error {
  readonly code = "world_version_conflict" as const

  constructor(
    public readonly entityTable: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly currentVersion: number,
  ) {
    super(
      `Concurrent edit detected on ${entityTable}/${entityId}: expected v${expectedVersion}, found v${currentVersion}. Reload and reapply.`,
    )
    this.name = "WorldConcurrencyConflictError"
  }
}

/** Validate that the row still carries the version the caller observed. */
export function ensureCurrentVersion(
  entityTable: string,
  entityId: string,
  expectedVersion: number | undefined | null,
  currentVersion: number | null | undefined,
): void {
  const stored = typeof currentVersion === "number" ? currentVersion : 1
  const expected = typeof expectedVersion === "number" ? expectedVersion : stored
  if (stored !== expected) {
    throw new WorldConcurrencyConflictError(entityTable, entityId, expected, stored)
  }
}

/** Next version for a successful compare-and-swap write. */
export function nextVersion(currentVersion: number | null | undefined): number {
  return (typeof currentVersion === "number" && Number.isFinite(currentVersion) ? Math.floor(currentVersion) : 1) + 1
}
