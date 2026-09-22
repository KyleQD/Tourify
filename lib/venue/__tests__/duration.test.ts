import { formatDurationMinutes, normalizeDurationMinutes } from "../duration"

describe("duration contract (VEN-077)", () => {
  it("formats minutes under an hour", () => {
    expect(formatDurationMinutes(45)).toBe("45m")
  })

  it("formats whole hours without remainder noise", () => {
    expect(formatDurationMinutes(120)).toBe("2h")
  })

  it("formats mixed hours and minutes", () => {
    expect(formatDurationMinutes(150)).toBe("2h 30m")
  })

  it("falls back for invalid/absent values", () => {
    expect(formatDurationMinutes(null)).toBe("2h")
    expect(formatDurationMinutes(undefined, 60)).toBe("1h")
    expect(formatDurationMinutes(-5, 90)).toBe("1h 30m")
    expect(normalizeDurationMinutes("abc", 45)).toBe(45)
  })

  it("normalizes numeric strings and rounds fractional input", () => {
    expect(normalizeDurationMinutes("90")).toBe(90)
    expect(normalizeDurationMinutes(90.6)).toBe(91)
  })

  it("is deterministic across repeated calls", () => {
    const a = formatDurationMinutes({ toString: () => "75" } as unknown as number)
    const b = formatDurationMinutes(Number("75"))
    expect(a).toBe(b)
  })
})
