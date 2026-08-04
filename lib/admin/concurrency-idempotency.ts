/**
 * REL-202 — Concurrency / idempotency simulation helpers (pure).
 *
 * Models racing and duplicate-request semantics for eight surfaces:
 *   1. Autosave (plan version conflict on concurrent writes)
 *   2. Stop reorder (contiguous ordinals under interleaved requests)
 *   3. Publication commit (idempotency key deduplication)
 *   4. Bulk assignment (partial failure visibility — never hidden)
 *   5. Inventory reserve / release / finalize (no double-consume)
 *   6. Ticket scan (finalize idempotency — double-scan safe)
 *   7. Finance posting (expected_updated_at CAS — no double-post)
 *   8. Provider webhook (signature + idempotency_key dedup — no duplicate side-effect)
 *
 * Pure: no I/O, no `server-only`. Safe in tests.
 */

// ---------------------------------------------------------------------------
// 1. Autosave — plan version conflict (optimistic CAS)
// ---------------------------------------------------------------------------

export interface PlanVersion {
  version: number
  data: Record<string, unknown>
}

export class PlanVersionConflictError extends Error {
  readonly code = "version_conflict"
  readonly status = 409
  constructor(
    public readonly expectedVersion: number,
    public readonly serverVersion: number,
  ) {
    super(`Version conflict. Expected ${expectedVersion}, server is at ${serverVersion}.`)
    this.name = "PlanVersionConflictError"
  }
}

/**
 * Simulate an autosave write with optimistic concurrency.
 * If expectedVersion does not match serverVersion, throws PlanVersionConflictError.
 * On success, bumps the server version.
 */
export function simulatePlanAutosave(
  server: PlanVersion,
  patch: { expectedVersion: number; data: Record<string, unknown> },
): PlanVersion {
  if (patch.expectedVersion !== server.version) {
    throw new PlanVersionConflictError(patch.expectedVersion, server.version)
  }
  return { version: server.version + 1, data: { ...server.data, ...patch.data } }
}

// ---------------------------------------------------------------------------
// 2. Stop reorder — race between two concurrent ordinal assignments
// ---------------------------------------------------------------------------

export interface ReorderRequest {
  requestId: string
  fromIndex: number
  toIndex: number
  serverVersionBefore: number
}

export class ReorderVersionConflictError extends Error {
  readonly code = "reorder_conflict"
  readonly status = 409
  constructor(
    public readonly requestId: string,
    public readonly expectedVersion: number,
    public readonly serverVersion: number,
  ) {
    super(`Reorder conflict on ${requestId}: expected v${expectedVersion}, server at v${expectedVersion}.`)
    this.name = "ReorderVersionConflictError"
  }
}

/** Simulate applying a reorder to an ordered list with optimistic versioning. */
export function simulateApplyReorder<T extends { id: string }>(
  state: { items: T[]; version: number },
  req: ReorderRequest,
): { items: T[]; version: number } {
  if (req.serverVersionBefore !== state.version) {
    throw new ReorderVersionConflictError(req.requestId, req.serverVersionBefore, state.version)
  }
  const items = [...state.items]
  const [moved] = items.splice(req.fromIndex, 1)
  items.splice(req.toIndex, 0, moved)
  return { items, version: state.version + 1 }
}

// ---------------------------------------------------------------------------
// 3. Publication commit — idempotency key deduplication
// ---------------------------------------------------------------------------

export interface PublicationRecord {
  idempotencyKey: string
  checksum: string
  orgId: string
  publicationType: string
}

export class PublicationDuplicateError extends Error {
  readonly code = "already_committed"
  readonly status = 200
  constructor(
    public readonly idempotencyKey: string,
    public readonly existing: PublicationRecord,
  ) {
    super(`Publication already committed for idempotency key ${idempotencyKey}.`)
    this.name = "PublicationDuplicateError"
  }
}

/**
 * Simulate a transactional publication commit.
 * Same (orgId, idempotencyKey) → returns existing record (idempotent).
 * Different checksum with same key → still returns existing (key wins).
 */
export function simulatePublicationCommit(
  store: Map<string, PublicationRecord>,
  record: PublicationRecord,
): { result: PublicationRecord; alreadyExisted: boolean } {
  const existing = store.get(`${record.orgId}:${record.idempotencyKey}`)
  if (existing) {
    return { result: existing, alreadyExisted: true }
  }
  store.set(`${record.orgId}:${record.idempotencyKey}`, record)
  return { result: record, alreadyExisted: false }
}

// ---------------------------------------------------------------------------
// 4. Bulk assignment — partial failure must never be hidden
// ---------------------------------------------------------------------------

export interface BulkItemOutcome {
  id: string
  ok: boolean
  error?: string
}

export interface BulkResult {
  results: BulkItemOutcome[]
  succeeded: number
  failed: number
  partialFailure: boolean
}

export function summarizeBulk(outcomes: BulkItemOutcome[]): BulkResult {
  const succeeded = outcomes.filter((r) => r.ok).length
  const failed = outcomes.length - succeeded
  return {
    results: outcomes,
    succeeded,
    failed,
    partialFailure: succeeded > 0 && failed > 0,
  }
}

// ---------------------------------------------------------------------------
// 5 & 6. Inventory reserve / release / finalize / scan (ticket)
// ---------------------------------------------------------------------------

export type InventoryReservationStatus = "reserved" | "released" | "finalized"

export interface InventoryReservation {
  id: string
  ticketTypeId: string
  quantity: number
  status: InventoryReservationStatus
  processedOrderId: string | null
}

export class InventoryConflictError extends Error {
  readonly status = 409
  constructor(
    public readonly code: "already_finalized" | "already_released" | "insufficient",
    message: string,
  ) {
    super(message)
    this.name = "InventoryConflictError"
  }
}

export interface InventoryState {
  totalCapacity: number
  reservations: InventoryReservation[]
}

function reservedQuantity(state: InventoryState): number {
  return state.reservations
    .filter((r) => r.status === "reserved" || r.status === "finalized")
    .reduce((sum, r) => sum + r.quantity, 0)
}

export function simulateReserveInventory(
  state: InventoryState,
  req: { reservationId: string; ticketTypeId: string; quantity: number; orderId?: string | null },
): InventoryReservation {
  // Idempotent: same reservationId → return existing
  const existing = state.reservations.find((r) => r.id === req.reservationId)
  if (existing) return existing

  const used = reservedQuantity(state)
  if (used + req.quantity > state.totalCapacity) {
    throw new InventoryConflictError("insufficient", `Insufficient capacity: ${used} of ${state.totalCapacity} used.`)
  }
  const reservation: InventoryReservation = {
    id: req.reservationId,
    ticketTypeId: req.ticketTypeId,
    quantity: req.quantity,
    status: "reserved",
    processedOrderId: req.orderId ?? null,
  }
  state.reservations.push(reservation)
  return reservation
}

export function simulateReleaseInventory(
  state: InventoryState,
  reservationId: string,
): InventoryReservation {
  const res = state.reservations.find((r) => r.id === reservationId)
  if (!res) throw new Error(`Reservation ${reservationId} not found.`)
  // Idempotent: already released → return as-is
  if (res.status === "released") return res
  if (res.status === "finalized")
    throw new InventoryConflictError("already_finalized", "Cannot release a finalized reservation.")
  res.status = "released"
  return res
}

/**
 * Finalize (sell/scan) a reservation.
 * Idempotent: calling twice with the same reservationId returns the finalized record
 * without double-counting (ticket scan safe).
 */
export function simulateFinalizeInventory(
  state: InventoryState,
  req: { reservationId: string; orderId?: string | null },
): InventoryReservation {
  const res = state.reservations.find((r) => r.id === req.reservationId)
  if (!res) throw new Error(`Reservation ${req.reservationId} not found.`)
  // Idempotent: already finalized → return as-is (ticket scan dedup)
  if (res.status === "finalized") return res
  if (res.status === "released")
    throw new InventoryConflictError("already_released", "Cannot finalize a released reservation.")
  res.status = "finalized"
  if (req.orderId) res.processedOrderId = req.orderId
  return res
}

// ---------------------------------------------------------------------------
// 7. Finance posting — expected_updated_at CAS (no double-post)
// ---------------------------------------------------------------------------

export interface FinanceRecord {
  id: string
  amount: number
  status: string
  updatedAt: string
}

export class FinanceCASConflictError extends Error {
  readonly code = "version_conflict"
  readonly status = 409
  constructor(
    public readonly expectedUpdatedAt: string,
    public readonly actualUpdatedAt: string,
  ) {
    super(`Finance CAS conflict. Expected updatedAt=${expectedUpdatedAt}, got ${actualUpdatedAt}.`)
    this.name = "FinanceCASConflictError"
  }
}

export function simulateFinancePost(
  record: FinanceRecord,
  patch: {
    expectedUpdatedAt: string
    amount?: number
    status?: string
    newUpdatedAt: string
  },
): FinanceRecord {
  if (patch.expectedUpdatedAt !== record.updatedAt) {
    throw new FinanceCASConflictError(patch.expectedUpdatedAt, record.updatedAt)
  }
  return {
    ...record,
    ...(typeof patch.amount === "number" ? { amount: patch.amount } : {}),
    ...(patch.status ? { status: patch.status } : {}),
    updatedAt: patch.newUpdatedAt,
  }
}

// ---------------------------------------------------------------------------
// 8. Provider webhook — signature + idempotency_key dedup
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  idempotencyKey: string
  providerId: string
  eventType: string
  payload: Record<string, unknown>
  signature: string
}

export class WebhookSignatureError extends Error {
  readonly code = "invalid_signature"
  readonly status = 401
  constructor(message: string) {
    super(message)
    this.name = "WebhookSignatureError"
  }
}

export class WebhookDuplicateError extends Error {
  readonly code = "duplicate_webhook"
  readonly status = 200
  constructor(public readonly idempotencyKey: string) {
    super(`Webhook already processed: ${idempotencyKey}`)
    this.name = "WebhookDuplicateError"
  }
}

/** Simulate webhook ingestion with signature verification and idempotency dedup. */
export function simulateWebhookIngestion(
  processed: Set<string>,
  event: WebhookEvent,
  opts: { expectedSignature: string },
): { ingested: boolean; idempotencyKey: string } {
  if (event.signature !== opts.expectedSignature) {
    throw new WebhookSignatureError(`Invalid signature for webhook ${event.idempotencyKey}.`)
  }
  const key = `${event.providerId}:${event.idempotencyKey}`
  if (processed.has(key)) {
    throw new WebhookDuplicateError(event.idempotencyKey)
  }
  processed.add(key)
  return { ingested: true, idempotencyKey: event.idempotencyKey }
}
