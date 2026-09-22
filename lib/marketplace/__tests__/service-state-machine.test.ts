import {
  applyServiceRequestTransition,
  buildOfferRevision,
  buildSupersededPatch,
  isRequestExpired,
  isOfferExpired,
  type ServiceRequestStatus,
} from "../service-state-machine"

// ---------------------------------------------------------------------------
// P7 state machine unit tests
// ---------------------------------------------------------------------------

describe("applyServiceRequestTransition — booking flow", () => {
  it("allows seller to review a submitted request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "review",
      actorRole: "seller",
      currentVersion: 1,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.nextStatus).toBe("under_review")
      expect(result.requestPatch.status).toBe("under_review")
      expect(result.requestPatch.optimistic_version).toBe(2)
    }
  })

  it("allows seller to accept a submitted booking request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "accept",
      actorRole: "seller",
      currentVersion: 3,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("accepted")
  })

  it("allows seller to counter a submitted booking request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "counter",
      actorRole: "seller",
      currentVersion: 1,
      notes: "Available Saturday instead.",
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.nextStatus).toBe("countered")
      expect(result.requestPatch.notes).toBe("Available Saturday instead.")
    }
  })

  it("allows buyer to accept a countered request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "countered",
      action: "accept",
      actorRole: "buyer",
      currentVersion: 2,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("accepted")
  })

  it("denies buyer from accepting (non-counter) booking directly", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "accept",
      actorRole: "buyer",
      currentVersion: 1,
    })
    expect(result.allowed).toBe(false)
  })

  it("allows buyer to cancel a submitted request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "cancel",
      actorRole: "buyer",
      currentVersion: 1,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("canceled")
  })

  it("denies transitioning from a terminal status", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "declined",
      action: "accept",
      actorRole: "seller",
      currentVersion: 5,
    })
    expect(result.allowed).toBe(false)
  })

  it("allows system to expire a submitted request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "expire",
      actorRole: "system",
      currentVersion: 1,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("expired")
  })
})

describe("applyServiceRequestTransition — quote flow", () => {
  it("allows seller to issue a quote on a submitted request", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "issue_quote",
      actorRole: "seller",
      currentVersion: 1,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("under_review")
  })

  it("allows buyer to accept a quote from under_review", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "under_review",
      action: "accept_quote",
      actorRole: "buyer",
      currentVersion: 2,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("payment_pending")
  })

  it("denies seller from accepting their own quote", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "under_review",
      action: "accept_quote",
      actorRole: "seller",
      currentVersion: 2,
    })
    expect(result.allowed).toBe(false)
  })

  it("allows system to confirm after payment_pending", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "payment_pending",
      action: "confirm",
      actorRole: "system",
      currentVersion: 4,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("confirmed")
  })

  it("allows seller to mark in_progress after confirmed", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "confirmed",
      action: "start",
      actorRole: "seller",
      currentVersion: 5,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("in_progress")
  })

  it("allows seller to complete from in_progress", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "in_progress",
      action: "complete",
      actorRole: "seller",
      currentVersion: 6,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("completed")
  })

  it("allows seller to refund from confirmed", () => {
    const result = applyServiceRequestTransition({
      currentStatus: "confirmed",
      action: "refund",
      actorRole: "seller",
      currentVersion: 5,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.nextStatus).toBe("refunded")
  })
})

describe("applyServiceRequestTransition — optimistic version", () => {
  it("increments optimistic_version by 1 on every allowed transition", () => {
    const version = 7
    const result = applyServiceRequestTransition({
      currentStatus: "submitted",
      action: "review",
      actorRole: "seller",
      currentVersion: version,
    })
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.requestPatch.optimistic_version).toBe(version + 1)
    }
  })
})

describe("buildOfferRevision", () => {
  it("creates a new offer row with correct revision_number", () => {
    const row = buildOfferRevision({
      requestId: "req-123",
      createdBy: "user-456",
      prevRevisionNumber: 2,
      input: {
        lineItems: [{ title: "Performance", quantity: 1, unitPrice: 500, total: 500 }],
        subtotal: 500,
        terms: "Net 30",
      },
    })

    expect(row.revision_number).toBe(3)
    expect(row.request_id).toBe("req-123")
    expect(row.created_by).toBe("user-456")
    expect(row.status).toBe("pending")
    expect(row.subtotal).toBe(500)
    expect(row.terms).toBe("Net 30")
  })

  it("first offer for a request gets revision_number 1", () => {
    const row = buildOfferRevision({
      requestId: "req-789",
      createdBy: "user-456",
      prevRevisionNumber: 0, // no existing offers
      input: { lineItems: [], subtotal: 0 },
    })
    expect(row.revision_number).toBe(1)
  })
})

describe("buildSupersededPatch", () => {
  it("returns superseded status patch", () => {
    const patch = buildSupersededPatch()
    expect(patch.status).toBe("superseded")
  })
})

describe("isRequestExpired", () => {
  it("returns false when expires_at is null", () => {
    expect(isRequestExpired(null)).toBe(false)
  })

  it("returns false when expires_at is in the future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    expect(isRequestExpired(future)).toBe(false)
  })

  it("returns true when expires_at is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(isRequestExpired(past)).toBe(true)
  })
})

describe("isOfferExpired", () => {
  it("returns true for past expiry", () => {
    const past = new Date(Date.now() - 5000).toISOString()
    expect(isOfferExpired(past)).toBe(true)
  })

  it("returns false for future expiry", () => {
    const future = new Date(Date.now() + 5000).toISOString()
    expect(isOfferExpired(future)).toBe(false)
  })
})

describe("superseded offer cannot be paid", () => {
  it("buildSupersededPatch produces status=superseded, preventing payment", () => {
    const patch = buildSupersededPatch()
    // A buyer must only accept 'pending' offers; superseded offers are not payable
    expect(patch.status).not.toBe("pending")
    expect(patch.status).not.toBe("accepted")
    expect(patch.status).toBe("superseded")
  })
})
