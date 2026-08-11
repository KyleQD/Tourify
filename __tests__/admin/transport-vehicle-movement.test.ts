/**
 * TRANS-302 — Vehicle movement command tests.
 */

import { describe, it, expect } from "vitest"
import {
  executeVehicleMovementCommand,
  isActiveMovement,
  movementDurationMinutes,
  type VehicleMovement,
  type CreateMovementCommand,
} from "@/lib/admin/transport-vehicle-movement"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-08-01T08:00:00.000Z"
const ACTOR = "user-1"
const MV_ID = "mv1"

const legCtx = () => ({
  tour_id: "t1",
  tour_version_id: "tv1",
  leg_id: "l1",
  from_stop_id: "s1",
  to_stop_id: "s2",
  stop_id: null,
})

const createCmd = (overrides: Partial<CreateMovementCommand> = {}): CreateMovementCommand => ({
  command: "create",
  idempotency_key: "idem-c1",
  actor: ACTOR,
  at: NOW,
  movement_id: MV_ID,
  vehicle_id: "v1",
  context: legCtx(),
  origin: { label: "Chicago" },
  destination: { label: "Detroit" },
  planned_departure_utc: "2026-08-01T08:00:00Z",
  planned_arrival_utc: "2026-08-01T12:00:00Z",
  ...overrides,
})

function createMovement(overrides: Partial<CreateMovementCommand> = {}): VehicleMovement {
  return executeVehicleMovementCommand(null, createCmd(overrides)).movement!
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("executeVehicleMovementCommand — create", () => {
  it("creates movement in proposed status", () => {
    const r = executeVehicleMovementCommand(null, createCmd())
    expect(r.status).toBe("ok")
    expect(r.movement!.status).toBe("proposed")
    expect(r.movement!.movement_id).toBe(MV_ID)
  })

  it("defaults passenger_ids and cargo_item_ids to empty", () => {
    const m = createMovement()
    expect(m.passenger_ids).toHaveLength(0)
    expect(m.cargo_item_ids).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("executeVehicleMovementCommand — lifecycle", () => {
  it("proposed → confirmed", () => {
    const m = createMovement()
    const r = executeVehicleMovementCommand(m, {
      command: "confirm", idempotency_key: "c1", actor: ACTOR, at: NOW, movement_id: MV_ID,
    })
    expect(r.status).toBe("ok")
    expect(r.movement!.status).toBe("confirmed")
  })

  it("confirmed → in_progress with actual_departure_utc", () => {
    const m = createMovement()
    const confirmed = executeVehicleMovementCommand(m, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, movement_id: MV_ID }).movement!
    const r = executeVehicleMovementCommand(confirmed, {
      command: "start", idempotency_key: "s", actor: ACTOR, at: NOW, movement_id: MV_ID, actual_departure_utc: "2026-08-01T08:05:00Z",
    })
    expect(r.movement!.status).toBe("in_progress")
    expect(r.movement!.actual_departure_utc).toBe("2026-08-01T08:05:00Z")
  })

  it("in_progress → completed with actual_arrival_utc", () => {
    const m = createMovement()
    const conf = executeVehicleMovementCommand(m, { command: "confirm", idempotency_key: "c", actor: ACTOR, at: NOW, movement_id: MV_ID }).movement!
    const started = executeVehicleMovementCommand(conf, { command: "start", idempotency_key: "s", actor: ACTOR, at: NOW, movement_id: MV_ID, actual_departure_utc: "2026-08-01T08:05:00Z" }).movement!
    const r = executeVehicleMovementCommand(started, {
      command: "complete", idempotency_key: "comp", actor: ACTOR, at: NOW, movement_id: MV_ID, actual_arrival_utc: "2026-08-01T12:10:00Z",
    })
    expect(r.movement!.status).toBe("completed")
    expect(r.movement!.actual_arrival_utc).toBe("2026-08-01T12:10:00Z")
  })

  it("blocks invalid transition: proposed → completed", () => {
    const m = createMovement()
    const r = executeVehicleMovementCommand(m, {
      command: "complete", idempotency_key: "x", actor: ACTOR, at: NOW, movement_id: MV_ID, actual_arrival_utc: NOW,
    })
    expect(r.status).toBe("invalid_transition")
  })
})

// ---------------------------------------------------------------------------
// Update command
// ---------------------------------------------------------------------------

describe("executeVehicleMovementCommand — update", () => {
  it("updates planned times and passenger list", () => {
    const m = createMovement()
    const r = executeVehicleMovementCommand(m, {
      command: "update",
      idempotency_key: "u1",
      actor: ACTOR,
      at: NOW,
      movement_id: MV_ID,
      planned_departure_utc: "2026-08-01T09:00:00Z",
      passenger_ids: ["p1", "p2"],
    })
    expect(r.movement!.planned_departure_utc).toBe("2026-08-01T09:00:00Z")
    expect(r.movement!.passenger_ids).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("isActiveMovement", () => {
  it("proposed/confirmed/in_progress are active", () => {
    for (const status of ["proposed", "confirmed", "in_progress"] as const) {
      expect(isActiveMovement({ ...createMovement(), status })).toBe(true)
    }
  })

  it("completed/cancelled are not active", () => {
    for (const status of ["completed", "cancelled"] as const) {
      expect(isActiveMovement({ ...createMovement(), status })).toBe(false)
    }
  })
})

describe("movementDurationMinutes", () => {
  it("calculates from planned times when no actuals", () => {
    const m = createMovement()
    expect(movementDurationMinutes(m)).toBe(240) // 4h
  })

  it("calculates from actual times when available", () => {
    const m: VehicleMovement = {
      ...createMovement(),
      actual_departure_utc: "2026-08-01T08:05:00Z",
      actual_arrival_utc: "2026-08-01T12:10:00Z",
    }
    expect(movementDurationMinutes(m)).toBe(245) // 4h 5m
  })

  it("returns null when times missing", () => {
    const m: VehicleMovement = {
      ...createMovement(),
      planned_departure_utc: null,
      planned_arrival_utc: null,
    }
    expect(movementDurationMinutes(m)).toBeNull()
  })
})
