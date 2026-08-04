/**
 * TRAVEL-302 — Travel segment command and state machine tests.
 */

import { describe, it, expect } from "vitest"
import {
  executeTravelSegmentCommand,
  isActiveSegment,
  isConfirmedSegment,
  validNextCommands,
  type TravelSegment,
  type CreateTravelSegmentCommand,
  type ConfirmTravelSegmentCommand,
} from "@/lib/admin/travel-segment-commands"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const ACTOR = "user-1"

const makeLegCtx = () => ({
  tour_id: "t1",
  tour_version_id: "tv1",
  leg_id: "l1",
  from_stop_id: "s1",
  to_stop_id: "s2",
  stop_id: null,
})

const createCmd = (overrides: Partial<CreateTravelSegmentCommand> = {}): CreateTravelSegmentCommand => ({
  command: "create",
  idempotency_key: "idem-create-1",
  actor: ACTOR,
  at: NOW,
  segment_id: "seg1",
  context: makeLegCtx(),
  mode: "air",
  origin: "ORD",
  destination: "DTW",
  passenger_count: 4,
  ...overrides,
})

function createSegment(overrides: Partial<CreateTravelSegmentCommand> = {}): TravelSegment {
  const result = executeTravelSegmentCommand(null, createCmd(overrides))
  return result.segment!
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("executeTravelSegmentCommand — create", () => {
  it("creates a segment in 'proposed' status", () => {
    const result = executeTravelSegmentCommand(null, createCmd())
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("proposed")
    expect(result.segment!.segment_id).toBe("seg1")
  })

  it("initializes audit_log with one entry", () => {
    const seg = createSegment()
    expect(seg.audit_log).toHaveLength(1)
    expect(seg.audit_log[0].command).toBe("create")
    expect(seg.audit_log[0].from_status).toBeNull()
    expect(seg.audit_log[0].to_status).toBe("proposed")
  })

  it("stores actor and timestamp", () => {
    const seg = createSegment()
    expect(seg.created_by).toBe(ACTOR)
    expect(seg.created_at).toBe(NOW)
  })
})

// ---------------------------------------------------------------------------
// request / hold / confirm
// ---------------------------------------------------------------------------

describe("executeTravelSegmentCommand — lifecycle transitions", () => {
  it("proposed → requested", () => {
    const seg = createSegment()
    const result = executeTravelSegmentCommand(seg, {
      command: "request", idempotency_key: "idem-req", actor: ACTOR, at: NOW, segment_id: "seg1",
    })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("requested")
  })

  it("requested → held with booking_reference", () => {
    const seg1 = createSegment()
    const seg2 = executeTravelSegmentCommand(seg1, {
      command: "request", idempotency_key: "r1", actor: ACTOR, at: NOW, segment_id: "seg1",
    }).segment!
    const result = executeTravelSegmentCommand(seg2, {
      command: "hold",
      idempotency_key: "h1",
      actor: ACTOR,
      at: NOW,
      segment_id: "seg1",
      booking_reference: "BOOKING-XYZ",
    })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("held")
    expect(result.segment!.booking_reference).toBe("BOOKING-XYZ")
  })

  it("held → confirmed with confirmation_reference", () => {
    const proposed = createSegment()
    const requested = executeTravelSegmentCommand(proposed, {
      command: "request", idempotency_key: "r1", actor: ACTOR, at: NOW, segment_id: "seg1",
    }).segment!
    const held = executeTravelSegmentCommand(requested, {
      command: "hold", idempotency_key: "h1", actor: ACTOR, at: NOW, segment_id: "seg1",
    }).segment!
    const result = executeTravelSegmentCommand(held, {
      command: "confirm",
      idempotency_key: "c1",
      actor: ACTOR,
      at: NOW,
      segment_id: "seg1",
      confirmation_reference: "CONF-12345",
    })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("confirmed")
    expect(result.segment!.confirmation_reference).toBe("CONF-12345")
  })

  it("confirmed → ticketed with ticket_reference", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    const result = executeTravelSegmentCommand(conf, {
      command: "ticket", idempotency_key: "t1", actor: ACTOR, at: NOW, segment_id: "seg1", ticket_reference: "TKT-999",
    })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("ticketed")
    expect(result.segment!.ticket_reference).toBe("TKT-999")
  })

  it("confirmed → cancelled with cancellation_reason", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    const result = executeTravelSegmentCommand(conf, {
      command: "cancel", idempotency_key: "x1", actor: ACTOR, at: NOW, segment_id: "seg1", cancellation_reason: "Artist schedule change",
    })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("cancelled")
    expect(result.segment!.cancellation_reason).toBe("Artist schedule change")
  })

  it("completed → reconciled", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    const comp = executeTravelSegmentCommand(conf, { command: "complete", idempotency_key: "co1", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const result = executeTravelSegmentCommand(comp, { command: "reconcile", idempotency_key: "rec1", actor: ACTOR, at: NOW, segment_id: "seg1" })
    expect(result.status).toBe("ok")
    expect(result.segment!.status).toBe("reconciled")
  })
})

// ---------------------------------------------------------------------------
// Invalid transitions
// ---------------------------------------------------------------------------

describe("executeTravelSegmentCommand — invalid transitions", () => {
  it("rejects proposed → completed (skipping steps)", () => {
    const seg = createSegment()
    const result = executeTravelSegmentCommand(seg, {
      command: "complete", idempotency_key: "x", actor: ACTOR, at: NOW, segment_id: "seg1",
    })
    expect(result.status).toBe("invalid_transition")
    expect(result.error).toContain("proposed")
  })

  it("rejects reconciled → any further transition", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    const comp = executeTravelSegmentCommand(conf, { command: "complete", idempotency_key: "co", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const rec = executeTravelSegmentCommand(comp, { command: "reconcile", idempotency_key: "rec", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const result = executeTravelSegmentCommand(rec, { command: "cancel", idempotency_key: "cx", actor: ACTOR, at: NOW, segment_id: "seg1" })
    expect(result.status).toBe("invalid_transition")
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("executeTravelSegmentCommand — validation", () => {
  it("requires confirmation_reference for confirm", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const result = executeTravelSegmentCommand(req, {
      command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "",
    } as ConfirmTravelSegmentCommand)
    expect(result.status).toBe("validation_error")
    expect(result.error).toContain("confirmation_reference")
  })

  it("requires ticket_reference for ticket", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    const result = executeTravelSegmentCommand(conf, {
      command: "ticket", idempotency_key: "t", actor: ACTOR, at: NOW, segment_id: "seg1", ticket_reference: "",
    })
    expect(result.status).toBe("validation_error")
    expect(result.error).toContain("ticket_reference")
  })
})

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe("executeTravelSegmentCommand — idempotency", () => {
  it("replaying the same idempotency key returns stored segment (no mutation)", () => {
    const seg = createSegment()
    const req1 = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r1", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const req2 = executeTravelSegmentCommand(req1, { command: "request", idempotency_key: "r1", actor: ACTOR, at: NOW, segment_id: "seg1" })
    expect(req2.status).toBe("idempotent")
    expect(req2.segment!.status).toBe("requested")
    expect(req2.segment!.audit_log).toHaveLength(req1.audit_log.length) // no new audit entry
  })
})

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

describe("audit log — append only", () => {
  it("audit log grows with each command", () => {
    const seg = createSegment()
    const req = executeTravelSegmentCommand(seg, { command: "request", idempotency_key: "r", actor: ACTOR, at: NOW, segment_id: "seg1" }).segment!
    const conf = executeTravelSegmentCommand(req, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, segment_id: "seg1", confirmation_reference: "CNF" } as ConfirmTravelSegmentCommand).segment!
    expect(conf.audit_log).toHaveLength(3) // create + request + confirm
    expect(conf.audit_log.every((e) => e.actor && e.at && e.command)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isActiveSegment / isConfirmedSegment / validNextCommands
// ---------------------------------------------------------------------------

describe("isActiveSegment", () => {
  it("proposed/requested/held/confirmed are active", () => {
    for (const status of ["proposed", "requested", "held", "confirmed"] as const) {
      const seg = { ...createSegment(), status }
      expect(isActiveSegment(seg)).toBe(true)
    }
  })

  it("cancelled/completed/reconciled are not active", () => {
    for (const status of ["cancelled", "completed", "reconciled"] as const) {
      const seg = { ...createSegment(), status }
      expect(isActiveSegment(seg)).toBe(false)
    }
  })
})

describe("isConfirmedSegment", () => {
  it("returns true when confirmed + confirmation_reference", () => {
    const seg = { ...createSegment(), status: "confirmed" as const, confirmation_reference: "CNF" }
    expect(isConfirmedSegment(seg)).toBe(true)
  })

  it("returns false when proposed", () => {
    expect(isConfirmedSegment(createSegment())).toBe(false)
  })
})

describe("validNextCommands", () => {
  it("proposed can be requested or cancelled", () => {
    const cmds = validNextCommands(createSegment())
    expect(cmds).toContain("request")
    expect(cmds).toContain("cancel")
  })

  it("reconciled has no valid next commands", () => {
    const seg = { ...createSegment(), status: "reconciled" as const }
    expect(validNextCommands(seg)).toHaveLength(0)
  })
})
