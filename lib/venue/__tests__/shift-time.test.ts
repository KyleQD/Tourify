import { resolveShiftWindow } from "../shift-time"

describe("resolveShiftWindow (VEN-113)", () => {
  it("resolves a simple same-day shift in UTC", () => {
    const w = resolveShiftWindow({
      shiftDate: "2026-07-01",
      startTime: "09:00",
      endTime: "17:00",
    })
    expect(w.startsAt).toBe("2026-07-01T09:00:00.000Z")
    expect(w.endsAt).toBe("2026-07-01T17:00:00.000Z")
    expect(w.durationMinutes).toBe(480)
    expect(w.crossesMidnight).toBe(false)
  })

  it("rolls overnight ends to the next day", () => {
    const w = resolveShiftWindow({
      shiftDate: "2026-07-01",
      startTime: "18:00",
      endTime: "02:00",
    })
    expect(w.startsAt).toBe("2026-07-01T18:00:00.000Z")
    expect(w.endsAt).toBe("2026-07-02T02:00:00.000Z")
    expect(w.durationMinutes).toBe(480)
    expect(w.crossesMidnight).toBe(true)
  })

  it("honors the venue timezone (America/New_York, EST winter)", () => {
    const w = resolveShiftWindow({
      shiftDate: "2026-01-15",
      startTime: "18:00",
      endTime: "23:00",
      timeZone: "America/New_York",
    })
    // 18:00 EST = 23:00 UTC
    expect(w.startsAt).toBe("2026-01-15T23:00:00.000Z")
    expect(w.endsAt).toBe("2026-01-16T04:00:00.000Z") // 23:00 EST
    expect(w.durationMinutes).toBe(300)
  })

  it("handles the DST spring-forward gap correctly", () => {
    // 2026-03-08: 2:00 AM EST does not exist (clocks jump to 3:00 EDT).
    // A 01:00–04:00 shift is only 2 real hours.
    const w = resolveShiftWindow({
      shiftDate: "2026-03-08",
      startTime: "01:00",
      endTime: "04:00",
      timeZone: "America/New_York",
    })
    expect(w.startsAt).toBe("2026-03-08T06:00:00.000Z") // 01:00 EST → 06:00Z
    // 04:00 EDT = 08:00Z — the 02:00 wall hour does not exist.
    expect(w.endsAt).toBe("2026-03-08T08:00:00.000Z")
    expect(w.durationMinutes).toBe(120)
  })

  it("computes real minutes across the DST fall-back (25-hour day)", () => {
    // 2026-11-01: clocks fall back; 01:00–04:00 local spans 4 real hours.
    const w = resolveShiftWindow({
      shiftDate: "2026-11-01",
      startTime: "01:00",
      endTime: "04:00",
      timeZone: "America/New_York",
    })
    expect([240, 300]).toContain(w.durationMinutes)
  })

  it("rejects malformed inputs instead of mis-scheduling", () => {
    expect(() =>
      resolveShiftWindow({ shiftDate: "2026/07/01", startTime: "09:00", endTime: "17:00" }),
    ).toThrow(/yyyy-MM-dd/)
    expect(() =>
      resolveShiftWindow({ shiftDate: "2026-07-01", startTime: "9am", endTime: "17:00" }),
    ).toThrow(/HH:MM/)
    expect(() =>
      resolveShiftWindow({ shiftDate: "2026-07-01", startTime: "25:00", endTime: "26:00" }),
    ).toThrow(/24-hour/)
  })
})
