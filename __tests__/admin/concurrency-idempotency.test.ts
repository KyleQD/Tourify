/**
 * REL-202 — Concurrency / idempotency suite.
 *
 * Acceptance criteria:
 *   Autosave, reorder, publish, bulk assignment, inventory, scan, finance
 *   posting and provider webhooks behave deterministically under duplicate
 *   and racing requests.
 *
 * Coverage:
 *   - Autosave: concurrent version-conflict → 409; winner takes server; loser
 *     receives diff, not silent overwrite.
 *   - Reorder: two racing reorders → last-one-in wins via optimistic version;
 *     ordinals are always contiguous 0..n-1.
 *   - Publish: duplicate idempotency key → same record returned; different key
 *     on same org → independent records; no second checksum overwrite.
 *   - Bulk: partial failure surface (some items fail) → partialFailure=true,
 *     never hidden; all-ok → partialFailure=false; all-fail → partialFailure=false.
 *   - Inventory reserve: same reservationId twice → idempotent (no double-reserve);
 *     over-capacity → 409.
 *   - Inventory release: already-released → idempotent; finalized → 409.
 *   - Inventory finalize (ticket scan): same reservationId twice → idempotent
 *     (double-scan safe); released → 409.
 *   - Finance posting: correct expected_updated_at → succeeds once; stale
 *     expected_updated_at on race → 409 (no double-post).
 *   - Provider webhook: valid signature + new key → ingested; duplicate key →
 *     WebhookDuplicateError (200 — no duplicate side-effect); bad signature →
 *     WebhookSignatureError (401) regardless of key.
 *   - Public helpers: assertUniqueContiguousOrdinals, buildTourPlanConflictDiff,
 *     summarizeBulkExecuteResults from existing modules agree with the simulation.
 */

import { describe, expect, it } from "vitest"

import {
  buildTourPlanConflictDiff,
} from "@/lib/admin/tour-plan-diff"
import {
  assignContiguousOrdinals,
  assertUniqueContiguousOrdinals,
  reorderStopsByIndex,
  TourStopOrdinalError,
} from "@/lib/admin/tour-stop-ordinals"
import {
  summarizeBulkExecuteResults,
} from "@/lib/admin/tour-bulk-command"
import {
  canTransitionPaymentStatus,
  canTransitionSettlementStatus,
} from "@/lib/admin/finance-command-schemas"
import {
  InventoryConflictError,
  PlanVersionConflictError,
  PublicationDuplicateError,
  ReorderVersionConflictError,
  simulateApplyReorder,
  simulateFinancePost,
  simulateFinalizeInventory,
  simulatePlanAutosave,
  simulatePublicationCommit,
  simulateReleaseInventory,
  simulateReserveInventory,
  summarizeBulk,
  WebhookDuplicateError,
  WebhookSignatureError,
  simulateWebhookIngestion,
  FinanceCASConflictError,
} from "@/lib/admin/concurrency-idempotency"

// ---------------------------------------------------------------------------
// Autosave — plan version conflict
// ---------------------------------------------------------------------------

describe("REL-202 autosave concurrency (plan version CAS)", () => {
  it("succeeds when expected version matches server version", () => {
    const server = { version: 3, data: { name: "Summer Run" } }
    const result = simulatePlanAutosave(server, { expectedVersion: 3, data: { name: "Fall Run" } })
    expect(result.version).toBe(4)
    expect(result.data.name).toBe("Fall Run")
  })

  it("throws PlanVersionConflictError when expected version is stale", () => {
    const server = { version: 5, data: { name: "Tour A" } }
    expect(() =>
      simulatePlanAutosave(server, { expectedVersion: 3, data: { name: "Tour B" } }),
    ).toThrow(PlanVersionConflictError)
  })

  it("conflict error exposes correct expected/server versions", () => {
    const server = { version: 7, data: {} }
    let err: PlanVersionConflictError | null = null
    try {
      simulatePlanAutosave(server, { expectedVersion: 5, data: {} })
    } catch (e) {
      err = e as PlanVersionConflictError
    }
    expect(err?.expectedVersion).toBe(5)
    expect(err?.serverVersion).toBe(7)
    expect(err?.status).toBe(409)
  })

  it("two concurrent writers: first-in wins; second must reload and retry", () => {
    let server = { version: 1, data: { name: "Original" } }

    // Writer A wins the race
    server = simulatePlanAutosave(server, { expectedVersion: 1, data: { name: "Writer A" } })
    expect(server.version).toBe(2)

    // Writer B was racing on version 1 — conflicts
    expect(() =>
      simulatePlanAutosave(server, { expectedVersion: 1, data: { name: "Writer B" } }),
    ).toThrow(PlanVersionConflictError)

    // Writer B reloads (version 2) and then succeeds
    server = simulatePlanAutosave(server, { expectedVersion: 2, data: { name: "Writer B" } })
    expect(server.data.name).toBe("Writer B")
    expect(server.version).toBe(3)
  })

  it("buildTourPlanConflictDiff describes field differences for user resolution", () => {
    const diff = buildTourPlanConflictDiff({
      expectedVersion: 1,
      server: { planVersion: 2, name: "New Title", stops: [] },
      client: { name: "Old Title", stops: [] },
    })
    expect(diff.fields).toContainEqual(expect.objectContaining({ path: "name" }))
    expect(diff.fields[0].server).toBe("New Title")
    expect(diff.fields[0].client).toBe("Old Title")
  })
})

// ---------------------------------------------------------------------------
// Stop reorder — concurrent ordinal assignments
// ---------------------------------------------------------------------------

describe("REL-202 stop reorder concurrency", () => {
  const stops = [
    { id: "s1" },
    { id: "s2" },
    { id: "s3" },
    { id: "s4" },
  ]

  it("first reorder wins; second on stale version is a conflict", () => {
    const state = { items: [...stops], version: 0 }
    const after = simulateApplyReorder(state, {
      requestId: "req-a",
      fromIndex: 0,
      toIndex: 2,
      serverVersionBefore: 0,
    })
    expect(after.version).toBe(1)
    expect(() =>
      simulateApplyReorder(after, {
        requestId: "req-b",
        fromIndex: 1,
        toIndex: 3,
        serverVersionBefore: 0, // stale
      }),
    ).toThrow(ReorderVersionConflictError)
  })

  it("after conflict, requester reloads and applies successfully", () => {
    const state = { items: [...stops], version: 2 }
    const after = simulateApplyReorder(state, {
      requestId: "req-retry",
      fromIndex: 2,
      toIndex: 0,
      serverVersionBefore: 2,
    })
    expect(after.version).toBe(3)
    expect(after.items[0].id).toBe("s3")
  })

  it("reorderStopsByIndex always produces contiguous 0..n-1 ordinals", () => {
    const result = reorderStopsByIndex({ stops, fromIndex: 3, toIndex: 1 })
    const ordinals = result.map((s) => s.ordinal)
    expect(ordinals).toEqual([0, 1, 2, 3])
    expect(result[1].id).toBe("s4")
  })

  it("assertUniqueContiguousOrdinals passes on correct sequence and throws on gap", () => {
    expect(() => assertUniqueContiguousOrdinals([{ ordinal: 0 }, { ordinal: 1 }, { ordinal: 2 }])).not.toThrow()
    expect(() => assertUniqueContiguousOrdinals([{ ordinal: 0 }, { ordinal: 2 }])).toThrow(TourStopOrdinalError)
  })

  it("assignContiguousOrdinals idempotently renumbers any input", () => {
    const disordered = [{ id: "x", ordinal: 99 }, { id: "y", ordinal: 5 }, { id: "z", ordinal: 0 }]
    const result = assignContiguousOrdinals(disordered)
    expect(result.map((s) => s.ordinal)).toEqual([0, 1, 2])
    expect(result.map((s) => s.id)).toEqual(["x", "y", "z"])
  })
})

// ---------------------------------------------------------------------------
// Publication commit — idempotency key deduplication
// ---------------------------------------------------------------------------

describe("REL-202 publication commit idempotency", () => {
  const rec = {
    idempotencyKey: "pub.commit:org-1:tour_book:tour:tour-abc:plan:3",
    checksum: "aabbcc11",
    orgId: "org-1",
    publicationType: "tour_book",
  }

  it("same idempotency key returns existing record, not a new one", () => {
    const store = new Map<string, typeof rec>()
    const first = simulatePublicationCommit(store, rec)
    expect(first.alreadyExisted).toBe(false)

    const second = simulatePublicationCommit(store, { ...rec, checksum: "different-checksum" })
    expect(second.alreadyExisted).toBe(true)
    expect(second.result.checksum).toBe("aabbcc11") // original not overwritten
    expect(store.size).toBe(1)
  })

  it("different idempotency key on same org produces independent records", () => {
    const store = new Map<string, typeof rec>()
    simulatePublicationCommit(store, { ...rec, idempotencyKey: "key-1" })
    simulatePublicationCommit(store, { ...rec, idempotencyKey: "key-2" })
    expect(store.size).toBe(2)
  })

  it("same idempotency key for different orgs are isolated", () => {
    const store = new Map<string, typeof rec>()
    simulatePublicationCommit(store, { ...rec, orgId: "org-A" })
    simulatePublicationCommit(store, { ...rec, orgId: "org-B" })
    expect(store.size).toBe(2)
  })

  it("PublicationDuplicateError carries the existing record for response passthrough", () => {
    const existing = { idempotencyKey: "dup-key", checksum: "cc", orgId: "o1", publicationType: "day_sheet" }
    const error = new PublicationDuplicateError("dup-key", existing)
    expect(error.existing.checksum).toBe("cc")
    expect(error.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Bulk assignment — partial failure visibility
// ---------------------------------------------------------------------------

describe("REL-202 bulk assignment partial failure", () => {
  it("partial failure is always visible — never hidden", () => {
    const results = summarizeBulk([
      { id: "t1", ok: true },
      { id: "t2", ok: false, error: "capability_denied" },
      { id: "t3", ok: true },
    ])
    expect(results.partialFailure).toBe(true)
    expect(results.succeeded).toBe(2)
    expect(results.failed).toBe(1)
  })

  it("all-ok → partialFailure=false", () => {
    const r = summarizeBulk([{ id: "t1", ok: true }, { id: "t2", ok: true }])
    expect(r.partialFailure).toBe(false)
    expect(r.failed).toBe(0)
  })

  it("all-fail → partialFailure=false (nothing succeeded)", () => {
    const r = summarizeBulk([{ id: "t1", ok: false }, { id: "t2", ok: false }])
    expect(r.partialFailure).toBe(false)
    expect(r.succeeded).toBe(0)
  })

  it("summarizeBulkExecuteResults from tour-bulk-command agrees with summarizeBulk", () => {
    const items = [
      { tourId: "t1", ok: true },
      { tourId: "t2", ok: false, error: "blocked" },
    ]
    const a = summarizeBulkExecuteResults(items)
    const b = summarizeBulk(items.map((r) => ({ id: r.tourId, ok: r.ok, error: r.error })))
    expect(a.partialFailure).toBe(b.partialFailure)
    expect(a.succeeded).toBe(b.succeeded)
    expect(a.failed).toBe(b.failed)
  })
})

// ---------------------------------------------------------------------------
// Inventory — reserve / release / finalize with racing requests
// ---------------------------------------------------------------------------

describe("REL-202 inventory reserve idempotency", () => {
  function makeState(capacity = 10) {
    return { totalCapacity: capacity, reservations: [] }
  }

  it("same reservationId twice → idempotent, capacity consumed only once", () => {
    const state = makeState(10)
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 3 })
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 3 })
    expect(state.reservations).toHaveLength(1)
    expect(state.reservations[0].quantity).toBe(3)
  })

  it("over-capacity request is rejected with InventoryConflictError", () => {
    const state = makeState(5)
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 4 })
    expect(() =>
      simulateReserveInventory(state, { reservationId: "r2", ticketTypeId: "tt1", quantity: 4 }),
    ).toThrow(InventoryConflictError)
  })

  it("two races try to take the last ticket — only first succeeds", () => {
    const state = makeState(2)
    simulateReserveInventory(state, { reservationId: "r-a", ticketTypeId: "tt1", quantity: 2 })
    expect(() =>
      simulateReserveInventory(state, { reservationId: "r-b", ticketTypeId: "tt1", quantity: 1 }),
    ).toThrow(InventoryConflictError)
    expect(state.reservations).toHaveLength(1)
  })
})

describe("REL-202 inventory release idempotency", () => {
  it("releasing the same reservation twice → idempotent (second call is no-op)", () => {
    const state = { totalCapacity: 10, reservations: [] }
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 2 })
    simulateReleaseInventory(state, "r1")
    const second = simulateReleaseInventory(state, "r1")
    expect(second.status).toBe("released")
    expect(state.reservations[0].status).toBe("released")
  })

  it("cannot release a finalized reservation", () => {
    const state = { totalCapacity: 10, reservations: [] }
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 1 })
    simulateFinalizeInventory(state, { reservationId: "r1" })
    expect(() => simulateReleaseInventory(state, "r1")).toThrow(InventoryConflictError)
  })
})

describe("REL-202 inventory finalize / ticket scan idempotency", () => {
  it("finalizing the same reservationId twice → idempotent (double-scan safe)", () => {
    const state = { totalCapacity: 20, reservations: [] }
    simulateReserveInventory(state, { reservationId: "r-scan", ticketTypeId: "tt1", quantity: 1 })
    simulateFinalizeInventory(state, { reservationId: "r-scan", orderId: "order-1" })
    // Second scan of the same ticket
    const second = simulateFinalizeInventory(state, { reservationId: "r-scan", orderId: "order-1" })
    expect(second.status).toBe("finalized")
    expect(state.reservations).toHaveLength(1) // no duplicate
  })

  it("cannot finalize a released reservation", () => {
    const state = { totalCapacity: 10, reservations: [] }
    simulateReserveInventory(state, { reservationId: "r1", ticketTypeId: "tt1", quantity: 1 })
    simulateReleaseInventory(state, "r1")
    expect(() => simulateFinalizeInventory(state, { reservationId: "r1" })).toThrow(InventoryConflictError)
  })

  it("concurrent scan attempts: first finalizes, second returns finalized idempotently", () => {
    const state = { totalCapacity: 10, reservations: [] }
    simulateReserveInventory(state, { reservationId: "r-concurrent", ticketTypeId: "tt1", quantity: 1 })
    const first = simulateFinalizeInventory(state, { reservationId: "r-concurrent" })
    const second = simulateFinalizeInventory(state, { reservationId: "r-concurrent" })
    expect(first.status).toBe("finalized")
    expect(second.status).toBe("finalized")
    expect(state.reservations).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Finance posting — expected_updated_at CAS
// ---------------------------------------------------------------------------

describe("REL-202 finance posting CAS concurrency", () => {
  const record = { id: "txn-1", amount: 500, status: "pending", updatedAt: "2026-07-20T10:00:00Z" }

  it("correct expected_updated_at → applies patch and advances timestamp", () => {
    const updated = simulateFinancePost(record, {
      expectedUpdatedAt: "2026-07-20T10:00:00Z",
      amount: 600,
      newUpdatedAt: "2026-07-20T10:01:00Z",
    })
    expect(updated.amount).toBe(600)
    expect(updated.updatedAt).toBe("2026-07-20T10:01:00Z")
  })

  it("stale expected_updated_at → FinanceCASConflictError (no double-post)", () => {
    expect(() =>
      simulateFinancePost(record, {
        expectedUpdatedAt: "2026-07-19T09:00:00Z",
        amount: 700,
        newUpdatedAt: "2026-07-20T10:01:00Z",
      }),
    ).toThrow(FinanceCASConflictError)
  })

  it("race: both writers have the same expected_updated_at; first wins, second conflicts", () => {
    let current = { id: "txn-2", amount: 100, status: "pending", updatedAt: "T0" }

    // First concurrent write succeeds
    current = simulateFinancePost(current, {
      expectedUpdatedAt: "T0",
      amount: 200,
      newUpdatedAt: "T1",
    })

    // Second concurrent write arrives with stale timestamp
    expect(() =>
      simulateFinancePost(current, {
        expectedUpdatedAt: "T0",
        amount: 300,
        newUpdatedAt: "T2",
      }),
    ).toThrow(FinanceCASConflictError)

    expect(current.amount).toBe(200) // only first write applied
  })

  it("same-status transition is idempotent per the payment status machine", () => {
    expect(canTransitionPaymentStatus("pending", "pending")).toBe(true)
    expect(canTransitionPaymentStatus("paid", "paid")).toBe(true)
  })

  it("forward settlement transitions are one-way (no rewind)", () => {
    expect(canTransitionSettlementStatus("draft", "finalized")).toBe(true)
    expect(canTransitionSettlementStatus("finalized", "draft")).toBe(false)
    expect(canTransitionSettlementStatus("paid", "draft")).toBe(false)
    expect(canTransitionSettlementStatus("paid", "finalized")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Provider webhooks — signature + idempotency_key dedup
// ---------------------------------------------------------------------------

describe("REL-202 provider webhook deduplication", () => {
  const VALID_SIG = "sha256=abc123"
  const event = {
    idempotencyKey: "evt_stripe_001",
    providerId: "stripe",
    eventType: "payment_intent.succeeded",
    payload: { amount: 5000 },
    signature: VALID_SIG,
  }

  it("valid signature + new key → ingested", () => {
    const processed = new Set<string>()
    const result = simulateWebhookIngestion(processed, event, { expectedSignature: VALID_SIG })
    expect(result.ingested).toBe(true)
    expect(processed.size).toBe(1)
  })

  it("duplicate delivery (same idempotency key) → WebhookDuplicateError, no side-effect", () => {
    const processed = new Set<string>()
    simulateWebhookIngestion(processed, event, { expectedSignature: VALID_SIG })
    expect(() =>
      simulateWebhookIngestion(processed, event, { expectedSignature: VALID_SIG }),
    ).toThrow(WebhookDuplicateError)
    expect(processed.size).toBe(1) // still only 1
  })

  it("WebhookDuplicateError has status 200 (acknowledged, not error)", () => {
    const err = new WebhookDuplicateError("key-x")
    expect(err.status).toBe(200)
    expect(err.code).toBe("duplicate_webhook")
  })

  it("invalid signature → WebhookSignatureError (401), not ingested", () => {
    const processed = new Set<string>()
    expect(() =>
      simulateWebhookIngestion(processed, { ...event, signature: "wrong-sig" }, { expectedSignature: VALID_SIG }),
    ).toThrow(WebhookSignatureError)
    expect(processed.size).toBe(0)
  })

  it("invalid signature even on a key that was previously processed → rejected", () => {
    const processed = new Set<string>()
    simulateWebhookIngestion(processed, event, { expectedSignature: VALID_SIG })
    // Replay with bad signature — should NOT bypass dedup and must be rejected
    expect(() =>
      simulateWebhookIngestion(processed, { ...event, signature: "tampered" }, { expectedSignature: VALID_SIG }),
    ).toThrow(WebhookSignatureError)
  })

  it("same event from different providers are independent — no cross-contamination", () => {
    const processed = new Set<string>()
    simulateWebhookIngestion(processed, { ...event, providerId: "stripe" }, { expectedSignature: VALID_SIG })
    const r2 = simulateWebhookIngestion(processed, { ...event, providerId: "paypal" }, { expectedSignature: VALID_SIG })
    expect(r2.ingested).toBe(true)
    expect(processed.size).toBe(2)
  })
})
