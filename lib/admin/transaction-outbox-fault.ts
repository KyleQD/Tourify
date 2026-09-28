/**
 * REL-201 — Transaction / outbox fault injection helpers (pure).
 *
 * These types and functions model the fault states that can occur around
 * the atomic domain-commit + outbox-enqueue pattern used throughout the
 * admin platform (tour transitions, publication commits, finance commands,
 * projection apply, etc.).
 *
 * Pure: no I/O, no imports from `server-only`. Safe in tests.
 */

// ---------------------------------------------------------------------------
// Fault phases
// ---------------------------------------------------------------------------

/**
 * The three observable failure points for a write+outbox operation:
 *
 * 1. `pre_commit`   — error raised before any DB write; nothing was written.
 * 2. `post_commit`  — domain row committed; outbox enqueue failed (crash / timeout).
 * 3. `during_retry` — outbox row exists; handler threw on a prior attempt.
 */
export type OutboxFaultPhase = "pre_commit" | "post_commit" | "during_retry"

// ---------------------------------------------------------------------------
// Simulated store helpers
// ---------------------------------------------------------------------------

export interface SimulatedDomainRow {
  transactionId: string
  orgId: string
  idempotencyKey: string
  commandName: string
  payload: Record<string, unknown>
}

export interface SimulatedOutboxRow {
  outboxId: string
  transactionId: string
  idempotencyKey: string
  eventType: string
  attempts: number
  maxAttempts: number
  status: "pending" | "processing" | "delivered" | "failed" | "dead"
  lastError: string | null
  handlerCallCount: number
}

export interface SimulatedStore {
  domainRows: SimulatedDomainRow[]
  outboxRows: SimulatedOutboxRow[]
  handlerInvocations: string[]
}

export function createSimulatedStore(): SimulatedStore {
  return { domainRows: [], outboxRows: [], handlerInvocations: [] }
}

// ---------------------------------------------------------------------------
// Commit + outbox simulation
// ---------------------------------------------------------------------------

export interface CommitWithOutboxOptions {
  orgId: string
  idempotencyKey: string
  commandName: string
  eventType: string
  payload?: Record<string, unknown>
  maxAttempts?: number
  /** When set, throws at this phase to simulate infrastructure failure. */
  faultPhase?: OutboxFaultPhase
}

export interface CommitWithOutboxResult {
  transactionId: string
  outboxId: string
  alreadyExisted: boolean
}

/**
 * Simulate an atomic domain-commit + outbox-enqueue.
 *
 * Fault injection:
 *  - `pre_commit`  → throws before writing anything
 *  - `post_commit` → writes domain row, then throws before outbox row
 *
 * Idempotent: re-calling with the same idempotency key returns existing row.
 */
export function simulateCommitWithOutbox(
  store: SimulatedStore,
  opts: CommitWithOutboxOptions,
): CommitWithOutboxResult {
  if (opts.faultPhase === "pre_commit") {
    throw Object.assign(new Error("Simulated pre-commit failure"), { phase: "pre_commit" })
  }

  // Idempotency check
  const existing = store.domainRows.find((r) => r.idempotencyKey === opts.idempotencyKey)
  const existingOutbox = store.outboxRows.find((r) => r.idempotencyKey === opts.idempotencyKey)

  if (existing && existingOutbox) {
    return { transactionId: existing.transactionId, outboxId: existingOutbox.outboxId, alreadyExisted: true }
  }

  // Domain write
  if (!existing) {
    store.domainRows.push({
      transactionId: `tx-${store.domainRows.length + 1}`,
      orgId: opts.orgId,
      idempotencyKey: opts.idempotencyKey,
      commandName: opts.commandName,
      payload: opts.payload ?? {},
    })
  }
  const row = store.domainRows.find((r) => r.idempotencyKey === opts.idempotencyKey)!

  if (opts.faultPhase === "post_commit") {
    throw Object.assign(new Error("Simulated post-commit / pre-outbox failure"), {
      phase: "post_commit",
      transactionId: row.transactionId,
    })
  }

  // Outbox enqueue
  const outboxId = `ob-${store.outboxRows.length + 1}`
  store.outboxRows.push({
    outboxId,
    transactionId: row.transactionId,
    idempotencyKey: opts.idempotencyKey,
    eventType: opts.eventType,
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 8,
    status: "pending",
    lastError: null,
    handlerCallCount: 0,
  })

  return { transactionId: row.transactionId, outboxId, alreadyExisted: false }
}

// ---------------------------------------------------------------------------
// Process outbox row (claim / handle / mark)
// ---------------------------------------------------------------------------

export type OutboxHandlerFn = (row: SimulatedOutboxRow) => void | never

/**
 * Simulate claim + process one outbox row.
 *
 * - If handler throws, marks the row `failed` (or `dead` at maxAttempts).
 * - Records each handler invocation in store.handlerInvocations for assertion.
 * - `during_retry` fault: throws on first attempt only.
 */
export function simulateProcessOutboxRow(
  store: SimulatedStore,
  outboxId: string,
  handler: OutboxHandlerFn,
  opts?: { faultPhase?: OutboxFaultPhase },
): { outcome: "delivered" | "failed" | "dead"; attempts: number } {
  const row = store.outboxRows.find((r) => r.outboxId === outboxId)
  if (!row) throw new Error(`Outbox row ${outboxId} not found`)
  if (row.status === "delivered") return { outcome: "delivered", attempts: row.attempts }

  row.status = "processing"
  row.attempts += 1

  // Fault injection: throw on first attempt only, simulating transient error.
  const injectFault = opts?.faultPhase === "during_retry" && row.attempts === 1

  try {
    if (injectFault) throw Object.assign(new Error("Simulated transient handler error"), { phase: "during_retry" })
    handler(row)
    store.handlerInvocations.push(row.idempotencyKey)
    row.status = "delivered"
    return { outcome: "delivered", attempts: row.attempts }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errCode = (err && typeof err === "object" && "code" in err) ? String((err as { code?: unknown }).code ?? "") : ""
    row.lastError = message
    const isDead = row.attempts >= row.maxAttempts || errCode === "fatal" || /\bfatal\b/i.test(message)
    row.status = isDead ? "dead" : "failed"
    return { outcome: isDead ? "dead" : "failed", attempts: row.attempts }
  }
}

/**
 * Replay a dead-lettered outbox row: reset to `pending` with attempts=0.
 * Does NOT create a new domain row (no duplicate side effect).
 */
export function simulateReplayDeadLetter(
  store: SimulatedStore,
  outboxId: string,
): SimulatedOutboxRow {
  const row = store.outboxRows.find((r) => r.outboxId === outboxId)
  if (!row) throw new Error(`Outbox row ${outboxId} not found`)
  if (row.status !== "dead") throw new Error("Only dead-letter rows can be replayed")

  const domainCountBefore = store.domainRows.filter((r) => r.idempotencyKey === row.idempotencyKey).length
  if (domainCountBefore !== 1) throw new Error("Invariant violation: exactly one domain row must exist before replay")

  row.status = "pending"
  row.attempts = 0
  row.lastError = null
  return row
}
