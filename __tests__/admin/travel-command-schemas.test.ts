import { describe, expect, it } from "vitest"

import {
  canTransitionTravelStatus,
  parseTravelCoordinationCommand,
} from "@/lib/admin/travel-command-schemas"

describe("TRAVEL-103 travel command schemas", () => {
  it("rejects unknown fields on create_travel_group", () => {
    const result = parseTravelCoordinationCommand({
      action: "create_travel_group",
      name: "Crew A",
      surprise: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unknown fields|Validation/i)
  })

  it("accepts a strict create_flight payload", () => {
    const result = parseTravelCoordinationCommand({
      action: "create_flight",
      flight_number: "AA100",
      airline: "American",
      departure_airport: "LAX",
      arrival_airport: "JFK",
      departure_time: "2026-08-01T10:00:00Z",
      arrival_time: "2026-08-01T18:00:00Z",
      tour_id: "11111111-1111-4111-8111-111111111111",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.action).toBe("create_flight")
      expect(result.data).not.toHaveProperty("surprise")
    }
  })

  it("rejects unknown actions", () => {
    const result = parseTravelCoordinationCommand({ action: "hack_the_planet", id: "x" })
    expect(result.ok).toBe(false)
  })

  it("enforces allowlisted status transitions", () => {
    expect(canTransitionTravelStatus("planning", "confirmed")).toBe(true)
    expect(canTransitionTravelStatus("completed", "planning")).toBe(false)
    expect(canTransitionTravelStatus("scheduled", "cancelled")).toBe(true)
  })

  it("rejects unknown fields on update_flight", () => {
    const result = parseTravelCoordinationCommand({
      action: "update_flight",
      id: "11111111-1111-4111-8111-111111111111",
      status: "confirmed",
      injected: "nope",
    })
    expect(result.ok).toBe(false)
  })

  it("accepts a strict update_travel_group status change", () => {
    const result = parseTravelCoordinationCommand({
      action: "update_travel_group",
      id: "11111111-1111-4111-8111-111111111111",
      status: "confirmed",
    })
    expect(result.ok).toBe(true)
  })
})
