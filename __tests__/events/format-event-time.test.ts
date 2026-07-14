import { describe, expect, it } from "vitest"
import { formatEventTime } from "@/lib/events/format-event-time"

describe("formatEventTime", () => {
  it("formats HH:mm:ss as 12-hour without seconds", () => {
    expect(formatEventTime("19:00:00")).toBe("7:00 PM")
    expect(formatEventTime("18:30:00")).toBe("6:30 PM")
    expect(formatEventTime("22:00:00")).toBe("10:00 PM")
  })

  it("formats HH:mm as 12-hour", () => {
    expect(formatEventTime("18:30")).toBe("6:30 PM")
    expect(formatEventTime("09:05")).toBe("9:05 AM")
    expect(formatEventTime("00:00")).toBe("12:00 AM")
    expect(formatEventTime("12:00")).toBe("12:00 PM")
  })

  it("formats ISO datetime values", () => {
    const result = formatEventTime("2029-09-08T19:00:00.000Z")
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  })

  it("returns empty string for nullish or invalid values", () => {
    expect(formatEventTime(null)).toBe("")
    expect(formatEventTime(undefined)).toBe("")
    expect(formatEventTime("")).toBe("")
    expect(formatEventTime("   ")).toBe("")
    expect(formatEventTime("not-a-time")).toBe("")
    expect(formatEventTime("25:00")).toBe("")
  })
})
