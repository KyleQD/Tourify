/**
 * PLAN-103 — Exact stop reconciliation with explicit modes.
 *
 * Detach removes tour↔event links only; event identity is retained unless a
 * separate delete-eligibility command runs.
 */

export type TourStopReconcileMode = "exact" | "merge" | "attach_only"

export interface TourStopLinkSnapshot {
  event_id: string
  ordinal: number
  is_primary?: boolean
  leg_name?: string | null
  market?: string | null
  advance_status?: string | null
  routing_notes?: string | null
}

export interface TourStopReconcilePlan {
  mode: TourStopReconcileMode
  /** Final link set to persist for exact mode; for merge/attach_only the upsert set. */
  upserts: TourStopLinkSnapshot[]
  /** Links to detach (exact mode only). Events are never deleted here. */
  detachEventIds: string[]
  addedEventIds: string[]
  updatedEventIds: string[]
  retainedEventIds: string[]
  orderChanged: boolean
}

export class TourStopReconcileError extends Error {
  readonly status = 400
  readonly code = "reconcile_invalid"

  constructor(message: string) {
    super(message)
    this.name = "TourStopReconcileError"
  }
}

export function assertTourStopReconcileMode(value: unknown): TourStopReconcileMode {
  if (value === "exact" || value === "merge" || value === "attach_only") return value
  throw new TourStopReconcileError(
    "reconcileMode must be one of: exact, merge, attach_only",
  )
}

/**
 * Plan stop reconciliation without side effects.
 * - exact: desired set is authoritative; omitted current links are detached
 * - merge: upsert desired; keep omitted current links (may leave ordinal gaps until next exact)
 * - attach_only: upsert desired only; never detach
 */
export function planTourStopReconciliation(args: {
  mode: TourStopReconcileMode
  current: TourStopLinkSnapshot[]
  desired: TourStopLinkSnapshot[]
}): TourStopReconcilePlan {
  const mode = args.mode
  const currentById = new Map(args.current.map((link) => [link.event_id, link]))
  const desiredNormalized = args.desired.map((link, index) => ({
    ...link,
    event_id: String(link.event_id),
    ordinal: typeof link.ordinal === "number" ? link.ordinal : index,
  }))

  const seen = new Set<string>()
  for (const link of desiredNormalized) {
    if (!link.event_id) throw new TourStopReconcileError("Every stop link requires an event_id.")
    if (seen.has(link.event_id)) {
      throw new TourStopReconcileError("Tour stops contain duplicate event IDs.")
    }
    seen.add(link.event_id)
  }

  const desiredById = new Map(desiredNormalized.map((link) => [link.event_id, link]))
  const addedEventIds = desiredNormalized
    .filter((link) => !currentById.has(link.event_id))
    .map((link) => link.event_id)
  const updatedEventIds = desiredNormalized
    .filter((link) => currentById.has(link.event_id))
    .map((link) => link.event_id)

  if (mode === "exact") {
    const detachEventIds = args.current
      .filter((link) => !desiredById.has(link.event_id))
      .map((link) => link.event_id)
    const upserts = desiredNormalized
      .slice()
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((link, index) => ({ ...link, ordinal: index }))

    const currentOrder = args.current
      .slice()
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((link) => link.event_id)
      .join("|")
    const nextOrder = upserts.map((link) => link.event_id).join("|")

    return {
      mode,
      upserts,
      detachEventIds,
      addedEventIds,
      updatedEventIds,
      retainedEventIds: [...detachEventIds],
      orderChanged: currentOrder !== nextOrder,
    }
  }

  // merge / attach_only — never detach
  const kept = mode === "merge"
    ? args.current.filter((link) => !desiredById.has(link.event_id))
    : []

  const maxKeptOrdinal = kept.reduce((max, link) => Math.max(max, link.ordinal), -1)
  const upserts = [
    ...kept,
    ...desiredNormalized.map((link, index) => ({
      ...link,
      ordinal: maxKeptOrdinal + 1 + index,
    })),
  ]
    .slice()
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((link, index) => ({ ...link, ordinal: index }))

  // For attach_only, only upsert the desired rows (leave others untouched in DB).
  const persistUpserts = mode === "attach_only" ? desiredNormalized : upserts

  const currentOrder = args.current
    .slice()
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((link) => link.event_id)
    .join("|")
  const nextOrder = upserts.map((link) => link.event_id).join("|")

  return {
    mode,
    upserts: persistUpserts,
    detachEventIds: [],
    addedEventIds,
    updatedEventIds,
    retainedEventIds: [],
    orderChanged: currentOrder !== nextOrder,
  }
}
