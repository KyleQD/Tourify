import { CONSUMING_RESERVATION_STATUSES, expandWithBuffers, findReservationConflict, rangesOverlap } from "../reservations"

const V = "venue-1"
const base = {
  startsAt: "2026-09-01T20:00:00Z",
  endsAt: "2026-09-01T23:00:00Z",
}

describe("reservation conflict semantics (VEN-084/078)", () => {
  it("exposes the consuming status set", () => {
    expect(CONSUMING_RESERVATION_STATUSES).toEqual(["hold", "offer", "contract", "confirmed"])
  })

  it("detects direct overlap on same venue+resource", () => {
    const conflict = findReservationConflict(
      { ...base, resourceKey: "whole_venue" },
      [{ ...base, status: "confirmed", venueId: V, resourceKey: "whole_venue" }],
      { venueId: V },
    )
    expect(conflict).not.toBeNull()
  })

  it("allows adjacent (back-to-back) bookings — half-open ranges", () => {
    const conflict = findReservationConflict(
      { startsAt: "2026-09-01T23:00:00Z", endsAt: "2026-09-02T02:00:00Z" },
      [{ ...base, status: "confirmed", venueId: V }],
      { venueId: V },
    )
    expect(conflict).toBeNull()
  })

  it("setup/teardown buffers extend the guarded range and conflict", () => {
    // Existing show ends 23:00 with 60m teardown → guarded until midnight.
    const existing = [
      { ...base, status: "confirmed", venueId: V, teardownBufferMinutes: 60 },
    ]
    expect(
      findReservationConflict(
        { startsAt: "2026-09-01T23:30:00Z", endsAt: "2026-09-02T01:00:00Z" },
        existing,
        { venueId: V },
      ),
    ).not.toBeNull()
    // But a next-day load-in after the buffer is fine.
    expect(
      findReservationConflict(
        { startsAt: "2026-09-02T00:00:00Z", endsAt: "2026-09-02T03:00:00Z" },
        existing,
        { venueId: V },
      ),
    ).toBeNull()
  })

  it("never conflicts across resources on the same venue", () => {
    const conflict = findReservationConflict(
      { ...base, resourceKey: "stage_b" },
      [{ ...base, status: "confirmed", venueId: V, resourceKey: "main_stage" }],
      { venueId: V },
    )
    expect(conflict).toBeNull()
  })

  it("ignores released/cancelled reservations", () => {
    const rows = ["released"].map((status) => ({ ...base, status, venueId: V }))
    expect(findReservationConflict({ ...base }, rows, { venueId: V })).toBeNull()
  })

  it("rejects invalid candidate ranges", () => {
    expect(() =>
      findReservationConflict(
        { startsAt: base.endsAt, endsAt: base.startsAt },
        [],
        { venueId: V },
      ),
    ).toThrow(/end after start/)
  })

  it("expandWithBuffers mirrors SQL bounds (720m clamp)", () => {
    const { startMs, endMs } = expandWithBuffers({
      ...base,
      setupBufferMinutes: 30,
      teardownBufferMinutes: 9999,
    })
    expect(startMs).toBe(new Date(base.startsAt).getTime() - 30 * 60_000)
    expect(endMs - new Date(base.endsAt).getTime()).toBe(720 * 60_000)
  })

  it("rangesOverlap agrees with the exclusion predicate", () => {
    expect(rangesOverlap(base, { ...base })).toBe(true)
    expect(rangesOverlap(base, { startsAt: base.endsAt, endsAt: "2026-09-02T04:00:00Z" })).toBe(false)
  })
})
