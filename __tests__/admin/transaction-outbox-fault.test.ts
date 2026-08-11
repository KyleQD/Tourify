/**
 * REL-201 — Transaction / outbox fault injection tests.
 *
 * Acceptance criteria:
 *   - Inject failure BEFORE commit → no partial write, no domain row, no outbox row.
 *   - Inject failure AFTER commit but BEFORE outbox enqueue → domain row exists,
 *     no outbox row; re-issue creates outbox row idempotently (no duplicate domain row).
 *   - Inject failure DURING retry → second attempt delivers; handler invoked once
 *     (no duplicate side effect); no false success on first attempt.
 *   - After max-attempts, row is `dead` (not silently dropped); recovery via
 *     replay re-queues without creating a duplicate domain row.
 *   - Handler idempotency: processing the same already-delivered row returns
 *     delivered immediately without invoking the handler again.
 *   - Recovery state is always accessible: dead rows are discoverable in the store.
 */

import { describe, expect, it } from "vitest"

import {
  computePublicationOutboxBackoffSeconds,
  nextOutboxStatusAfterFailure,
  shouldDeadLetterOutbox,
} from "@/lib/admin/publication-outbox"
import {
  createSimulatedStore,
  simulateCommitWithOutbox,
  simulateProcessOutboxRow,
  simulateReplayDeadLetter,
} from "@/lib/admin/transaction-outbox-fault"

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

const BASE = {
  orgId: "org-1",
  idempotencyKey: "test:tour.lifecycle_changed:tour:tour-abc:publish:draft->active",
  commandName: "tour.transition.publish",
  eventType: "tour.lifecycle_changed",
  payload: { tourId: "tour-abc", fromState: "draft", toState: "active" },
  maxAttempts: 3,
}

function noOpHandler(): void {
  // succeeds silently
}

function fatalHandler(): never {
  throw Object.assign(new Error("Permanent authorization failure"), { code: "fatal" })
}

// ---------------------------------------------------------------------------
// Pre-commit fault: nothing written
// ---------------------------------------------------------------------------

describe("REL-201 pre-commit fault", () => {
  it("throws before writing any row — no domain row, no outbox row, no partial state", () => {
    const store = createSimulatedStore()

    expect(() =>
      simulateCommitWithOutbox(store, { ...BASE, faultPhase: "pre_commit" }),
    ).toThrow(/pre-commit/)

    expect(store.domainRows).toHaveLength(0)
    expect(store.outboxRows).toHaveLength(0)
    expect(store.handlerInvocations).toHaveLength(0)
  })

  it("pre-commit error carries phase metadata for tracing", () => {
    const store = createSimulatedStore()
    let caught: Error | null = null
    try {
      simulateCommitWithOutbox(store, { ...BASE, faultPhase: "pre_commit" })
    } catch (err) {
      caught = err as Error
    }
    expect(caught).not.toBeNull()
    expect((caught as unknown as { phase?: string }).phase).toBe("pre_commit")
  })
})

// ---------------------------------------------------------------------------
// Post-commit / pre-outbox fault: domain row exists, outbox row missing
// ---------------------------------------------------------------------------

describe("REL-201 post-commit / pre-outbox fault", () => {
  it("commits the domain row but leaves no outbox row on outbox-enqueue crash", () => {
    const store = createSimulatedStore()

    let caught: Error & { phase?: string } | null = null
    try {
      simulateCommitWithOutbox(store, { ...BASE, faultPhase: "post_commit" })
    } catch (err) {
      caught = err as Error & { phase?: string }
    }

    expect(caught?.phase).toBe("post_commit")
    // Domain row was committed
    expect(store.domainRows).toHaveLength(1)
    expect(store.domainRows[0].idempotencyKey).toBe(BASE.idempotencyKey)
    // Outbox row was NOT written
    expect(store.outboxRows).toHaveLength(0)
  })

  it("re-issuing after post-commit fault creates outbox row without duplicate domain row", () => {
    const store = createSimulatedStore()

    // First attempt: post_commit fault
    try {
      simulateCommitWithOutbox(store, { ...BASE, faultPhase: "post_commit" })
    } catch {
      // expected
    }
    expect(store.domainRows).toHaveLength(1)
    expect(store.outboxRows).toHaveLength(0)

    // Second attempt: no fault → outbox row created, domain row NOT duplicated
    const result = simulateCommitWithOutbox(store, { ...BASE })

    expect(result.alreadyExisted).toBe(false)
    expect(store.domainRows).toHaveLength(1) // still 1 — idempotent
    expect(store.outboxRows).toHaveLength(1)
    expect(store.outboxRows[0].idempotencyKey).toBe(BASE.idempotencyKey)
  })

  it("re-issuing the same commit again with both rows present returns alreadyExisted=true", () => {
    const store = createSimulatedStore()
    simulateCommitWithOutbox(store, { ...BASE })

    const result = simulateCommitWithOutbox(store, { ...BASE })

    expect(result.alreadyExisted).toBe(true)
    expect(store.domainRows).toHaveLength(1)
    expect(store.outboxRows).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Retry fault: handler fails on first attempt; second attempt delivers
// ---------------------------------------------------------------------------

describe("REL-201 during-retry fault", () => {
  it("does not report false success on first (failing) attempt", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE })

    const first = simulateProcessOutboxRow(store, outboxId, noOpHandler, {
      faultPhase: "during_retry",
    })

    expect(first.outcome).toBe("failed")
    expect(first.attempts).toBe(1)
    expect(store.outboxRows[0].status).toBe("failed")
    expect(store.handlerInvocations).toHaveLength(0) // handler never reached
  })

  it("second attempt delivers and records exactly one handler invocation (no duplicate)", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE })

    // First attempt: fault
    simulateProcessOutboxRow(store, outboxId, noOpHandler, { faultPhase: "during_retry" })

    // Reset to pending (simulates scheduler re-claim after backoff)
    store.outboxRows[0].status = "pending"

    // Second attempt: succeeds
    const second = simulateProcessOutboxRow(store, outboxId, noOpHandler)

    expect(second.outcome).toBe("delivered")
    expect(store.outboxRows[0].status).toBe("delivered")
    expect(store.handlerInvocations).toHaveLength(1) // exactly one invocation
  })

  it("backoff increases exponentially to cap at 3600 s", () => {
    expect(computePublicationOutboxBackoffSeconds(1)).toBe(5)
    expect(computePublicationOutboxBackoffSeconds(4)).toBe(40)
    expect(computePublicationOutboxBackoffSeconds(10)).toBe(2560)
    expect(computePublicationOutboxBackoffSeconds(15)).toBe(3600)
  })
})

// ---------------------------------------------------------------------------
// Dead-letter: no silent drop; row is discoverable; replay re-queues
// ---------------------------------------------------------------------------

describe("REL-201 dead-letter and replay", () => {
  it("row becomes dead after max attempts — not silently dropped", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE, maxAttempts: 2 })

    // Two failing attempts
    for (let i = 0; i < 2; i++) {
      if (store.outboxRows[0].status === "failed") store.outboxRows[0].status = "pending"
      simulateProcessOutboxRow(store, outboxId, () => {
        throw Object.assign(new Error("transient"), { code: "retryable" })
      })
    }

    const row = store.outboxRows.find((r) => r.outboxId === outboxId)!
    expect(row.status).toBe("dead")
    expect(row.lastError).toMatch(/transient/)
  })

  it("dead row is discoverable in the outbox store (not lost)", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE, maxAttempts: 1 })

    simulateProcessOutboxRow(store, outboxId, () => {
      throw new Error("immediate dead")
    })

    const deadRows = store.outboxRows.filter((r) => r.status === "dead")
    expect(deadRows).toHaveLength(1)
    expect(deadRows[0].outboxId).toBe(outboxId)
  })

  it("replay re-queues dead row without creating a duplicate domain row", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE, maxAttempts: 1 })

    // Drive to dead
    simulateProcessOutboxRow(store, outboxId, () => {
      throw new Error("fatal error")
    })

    const domainCountBefore = store.domainRows.length
    const replayed = simulateReplayDeadLetter(store, outboxId)

    expect(replayed.status).toBe("pending")
    expect(replayed.attempts).toBe(0)
    expect(store.domainRows).toHaveLength(domainCountBefore) // no new domain row
  })

  it("replayed row can be successfully processed after replay", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE, maxAttempts: 1 })

    // Drive to dead
    simulateProcessOutboxRow(store, outboxId, () => {
      throw new Error("transient failure")
    })

    // Replay
    simulateReplayDeadLetter(store, outboxId)
    // Reset max attempts for retry
    store.outboxRows[0].maxAttempts = 3

    const result = simulateProcessOutboxRow(store, outboxId, noOpHandler)

    expect(result.outcome).toBe("delivered")
    expect(store.handlerInvocations).toHaveLength(1)
  })

  it("replay is rejected for non-dead rows", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE })

    expect(() => simulateReplayDeadLetter(store, outboxId)).toThrow("Only dead-letter rows can be replayed")
  })
})

// ---------------------------------------------------------------------------
// Fatal handler → immediate dead (no wasted retry budget)
// ---------------------------------------------------------------------------

describe("REL-201 fatal handler error", () => {
  it("fatal error causes immediate dead classification — no retries consumed", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE, maxAttempts: 8 })

    const result = simulateProcessOutboxRow(store, outboxId, fatalHandler)

    expect(result.outcome).toBe("dead")
    expect(result.attempts).toBe(1) // only 1 attempt consumed
    expect(store.outboxRows[0].status).toBe("dead")
  })

  it("shouldDeadLetterOutbox classifies fatal immediately regardless of attempts", () => {
    expect(shouldDeadLetterOutbox({ attempts: 1, maxAttempts: 8, errorClass: "fatal" })).toBe(true)
    expect(shouldDeadLetterOutbox({ attempts: 3, maxAttempts: 8, errorClass: "retryable" })).toBe(false)
    expect(nextOutboxStatusAfterFailure({ attempts: 8, maxAttempts: 8, errorClass: "retryable" })).toBe("dead")
  })
})

// ---------------------------------------------------------------------------
// Handler idempotency: already-delivered row not re-processed
// ---------------------------------------------------------------------------

describe("REL-201 handler idempotency on already-delivered row", () => {
  it("returns delivered immediately for an already-delivered row without calling handler again", () => {
    const store = createSimulatedStore()
    const { outboxId } = simulateCommitWithOutbox(store, { ...BASE })

    // First process: succeeds
    simulateProcessOutboxRow(store, outboxId, noOpHandler)
    expect(store.handlerInvocations).toHaveLength(1)

    // Second process: should short-circuit
    const second = simulateProcessOutboxRow(store, outboxId, noOpHandler)

    expect(second.outcome).toBe("delivered")
    expect(store.handlerInvocations).toHaveLength(1) // still only 1 invocation
  })
})

// ---------------------------------------------------------------------------
// Multiple independent transactions: no cross-contamination
// ---------------------------------------------------------------------------

describe("REL-201 multiple independent transactions", () => {
  it("two different idempotency keys produce two domain rows and two outbox rows", () => {
    const store = createSimulatedStore()

    simulateCommitWithOutbox(store, { ...BASE, idempotencyKey: "key-1", eventType: "type.a" })
    simulateCommitWithOutbox(store, { ...BASE, idempotencyKey: "key-2", eventType: "type.b" })

    expect(store.domainRows).toHaveLength(2)
    expect(store.outboxRows).toHaveLength(2)
    expect(store.outboxRows[0].idempotencyKey).toBe("key-1")
    expect(store.outboxRows[1].idempotencyKey).toBe("key-2")
  })

  it("fault on one transaction does not affect the other", () => {
    const store = createSimulatedStore()

    try {
      simulateCommitWithOutbox(store, { ...BASE, idempotencyKey: "key-fail", faultPhase: "pre_commit" })
    } catch {
      // expected
    }

    simulateCommitWithOutbox(store, { ...BASE, idempotencyKey: "key-ok" })

    expect(store.domainRows).toHaveLength(1)
    expect(store.domainRows[0].idempotencyKey).toBe("key-ok")
    expect(store.outboxRows).toHaveLength(1)
  })
})
