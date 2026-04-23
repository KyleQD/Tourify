import { addDaysIso, shiftRangeFromAnchor } from "../staff-shift-date-range"

describe("staff-shift-date-range", () => {
  describe("addDaysIso", () => {
    it("adds one day", () => {
      expect(addDaysIso("2026-04-10", 1)).toBe("2026-04-11")
    })
    it("rolls month", () => {
      expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01")
    })
    it("handles leap year", () => {
      expect(addDaysIso("2024-02-28", 1)).toBe("2024-02-29")
      expect(addDaysIso("2024-02-29", 1)).toBe("2024-03-01")
    })
    it("subtracts days", () => {
      expect(addDaysIso("2026-04-10", -7)).toBe("2026-04-03")
    })
  })

  describe("shiftRangeFromAnchor", () => {
    it("day mode uses same from/to", () => {
      expect(shiftRangeFromAnchor("day", "2026-05-01")).toEqual({
        dateFrom: "2026-05-01",
        dateTo: "2026-05-01",
        navStepDays: 1,
      })
    })
    it("week mode spans seven calendar days", () => {
      expect(shiftRangeFromAnchor("week", "2026-05-01")).toEqual({
        dateFrom: "2026-05-01",
        dateTo: "2026-05-07",
        navStepDays: 7,
      })
    })
  })
})
