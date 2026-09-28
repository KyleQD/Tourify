/**
 * PLAN-203 — Deterministic ordinal assignment for stop reorder.
 * Prevents duplicate/missing ordinals after keyboard or pointer reorder.
 */

export interface OrdinalStop {
  id: string
  ordinal?: number | null
}

export class TourStopOrdinalError extends Error {
  readonly code = "ordinal_invalid"

  constructor(message: string) {
    super(message)
    this.name = "TourStopOrdinalError"
  }
}

/** Reassign contiguous 0..n-1 ordinals in the given order. */
export function assignContiguousOrdinals<T extends OrdinalStop>(
  stops: readonly T[],
): Array<T & { ordinal: number }> {
  return stops.map((stop, index) => ({ ...stop, ordinal: index }))
}

/**
 * Move stop at fromIndex to toIndex (pointer/DnD).
 * Returns a new array with contiguous ordinals.
 */
export function reorderStopsByIndex<T extends OrdinalStop>(args: {
  stops: readonly T[]
  fromIndex: number
  toIndex: number
}): Array<T & { ordinal: number }> {
  const { stops, fromIndex, toIndex } = args
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= stops.length
    || toIndex >= stops.length
  ) {
    throw new TourStopOrdinalError("Reorder indices are out of range.")
  }
  if (fromIndex === toIndex) return assignContiguousOrdinals(stops)

  const next = [...stops]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return assignContiguousOrdinals(next)
}

/** Keyboard: move stop up/down by one position. */
export function moveStopByDelta<T extends OrdinalStop>(args: {
  stops: readonly T[]
  stopId: string
  delta: -1 | 1
}): Array<T & { ordinal: number }> {
  const fromIndex = args.stops.findIndex((stop) => stop.id === args.stopId)
  if (fromIndex < 0) throw new TourStopOrdinalError("Stop not found for reorder.")
  const toIndex = fromIndex + args.delta
  if (toIndex < 0 || toIndex >= args.stops.length) return assignContiguousOrdinals(args.stops)
  return reorderStopsByIndex({ stops: args.stops, fromIndex, toIndex })
}

/** Validate unique contiguous ordinals 0..n-1. */
export function assertUniqueContiguousOrdinals(
  stops: readonly { ordinal?: number | null }[],
): void {
  const ordinals = stops.map((stop, index) =>
    typeof stop.ordinal === "number" ? stop.ordinal : index,
  )
  const sorted = [...ordinals].sort((a, b) => a - b)
  for (let index = 0; index < sorted.length; index += 1) {
    if (sorted[index] !== index) {
      throw new TourStopOrdinalError(
        `Ordinal sequence must be contiguous 0..${sorted.length - 1} without duplicates.`,
      )
    }
  }
}
