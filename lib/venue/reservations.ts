// ─────────────────────────────────────────────────────────────────────────────
// VEN-084/078 — TypeScript mirror of the SQL reservation semantics
// (migration 20260823140000). The DATABASE is authoritative: the exclusion
// constraint decides conflicts transactionally. These pure helpers exist so
// client UX (e.g. availability previews) can agree with the same math and so
// the rules are testable without a database.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSUMING_RESERVATION_STATUSES = [
  "hold",
  "offer",
  "contract",
  "confirmed",
] as const

export type ConsumingReservationStatus = (typeof CONSUMING_RESERVATION_STATUSES)[number]

export interface IntervalInput {
  startsAt: string | number | Date
  endsAt: string | number | Date
  setupBufferMinutes?: number
  teardownBufferMinutes?: number
}

function toMs(value: IntervalInput["startsAt"]): number {
  return new Date(value).getTime()
}

/** Expand an interval with its setup/teardown buffers (SQL reserved_range). */
export function expandWithBuffers(interval: IntervalInput): { startMs: number; endMs: number } {
  const setup = Math.max(0, Math.min(720, interval.setupBufferMinutes ?? 0)) * 60_000
  const teardown = Math.max(0, Math.min(720, interval.teardownBufferMinutes ?? 0)) * 60_000
  return {
    startMs: toMs(interval.startsAt) - setup,
    endMs: toMs(interval.endsAt) + teardown,
  }
}

/** Half-open overlap check `[a.start, a.end) && [b.start, b.end)` — mirrors `&&`. */
export function rangesOverlap(a: IntervalInput, b: IntervalInput): boolean {
  const ra = expandWithBuffers(a)
  const rb = expandWithBuffers(b)
  return ra.startMs < rb.endMs && rb.startMs < ra.endMs
}

/**
 * Would `candidate` conflict with any ACTIVE reservation on the same
 * venue+resource? Same venue on a DIFFERENT resource never conflicts.
 * Zero-length or inverted candidates are invalid by definition.
 */
export function findReservationConflict<T extends { status: string }>(
  candidate: IntervalInput & { resourceKey?: string },
  existing: Array<
    T & {
      venueId: string
      resourceKey?: string
      startsAt: IntervalInput["startsAt"]
      endsAt: IntervalInput["endsAt"]
      setupBufferMinutes?: number
      teardownBufferMinutes?: number
    }
  >,
  options: { venueId: string },
): T | null {
  if (
    !Number.isFinite(toMs(candidate.startsAt)) ||
    !Number.isFinite(toMs(candidate.endsAt)) ||
    toMs(candidate.endsAt) <= toMs(candidate.startsAt)
  ) {
    throw new Error("Candidate range must have end after start")
  }

  const resource = candidate.resourceKey || "whole_venue"
  for (const row of existing) {
    if (!CONSUMING_RESERVATION_STATUSES.includes(row.status as ConsumingReservationStatus)) {
      continue
    }
    if (row.venueId !== options.venueId) continue
    if ((row.resourceKey || "whole_venue") !== resource) continue
    if (rangesOverlap(candidate, row)) return row
  }
  return null
}
