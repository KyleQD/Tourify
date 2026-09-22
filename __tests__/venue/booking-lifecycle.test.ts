import { describe, expect, it } from "vitest"
import {
  canTransitionVenueBookingLifecycle,
  getVenueBookingLifecycleTransitions,
  isVenueBookingLifecycleStatus,
  mapLegacyBookingStatus,
  mapLifecycleToLegacyBookingStatus,
  resolveVenueBookingLifecycleStatus,
  VENUE_BOOKING_LIFECYCLE_STATUSES,
  VENUE_BOOKING_LIFECYCLE_TERMINAL_STATUSES,
  VENUE_BOOKING_LIFECYCLE_TRANSITIONS,
} from "@/lib/venue/booking-lifecycle"

describe("venue booking lifecycle compatibility", () => {
  it("maps legacy records without rewriting stored values", () => {
    expect(mapLegacyBookingStatus("pending")).toBe("inquiry")
    expect(mapLegacyBookingStatus("approved")).toBe("confirmed")
    expect(mapLegacyBookingStatus("rejected")).toBe("cancelled")
    expect(mapLegacyBookingStatus("anything-else")).toBe("inquiry")
    expect(mapLegacyBookingStatus(null)).toBe("inquiry")
  })

  it("prefers canonical lifecycle values when present", () => {
    expect(
      resolveVenueBookingLifecycleStatus({
        status: "pending",
        lifecycle_status: "contract",
      }),
    ).toBe("contract")
    expect(
      resolveVenueBookingLifecycleStatus({
        status: "approved",
        lifecycle_status: "not-a-canonical-state",
      }),
    ).toBe("confirmed")
  })

  it("recognizes only the persisted canonical states", () => {
    for (const status of VENUE_BOOKING_LIFECYCLE_STATUSES) {
      expect(isVenueBookingLifecycleStatus(status)).toBe(true)
    }
    expect(isVenueBookingLifecycleStatus("completed")).toBe(false)
    expect(isVenueBookingLifecycleStatus(null)).toBe(false)
  })

  it("matches the complete reviewed transition matrix", () => {
    const expected = {
      inquiry: ["hold", "offer", "cancelled"],
      hold: ["inquiry", "offer", "cancelled"],
      offer: ["hold", "contract", "cancelled"],
      contract: ["offer", "confirmed", "cancelled"],
      confirmed: ["cancelled"],
      cancelled: [],
    } as const

    expect(VENUE_BOOKING_LIFECYCLE_TRANSITIONS).toEqual(expected)
    for (const from of VENUE_BOOKING_LIFECYCLE_STATUSES) {
      expect(getVenueBookingLifecycleTransitions(from)).toEqual(expected[from])
      for (const to of VENUE_BOOKING_LIFECYCLE_STATUSES) {
        expect(canTransitionVenueBookingLifecycle(from, to)).toBe(
          expected[from].includes(to),
        )
      }
    }
  })

  it("supports the forward booking path and cancellation from every live state", () => {
    const forwardPath = ["inquiry", "hold", "offer", "contract", "confirmed"] as const
    for (let index = 0; index < forwardPath.length - 1; index += 1) {
      expect(
        canTransitionVenueBookingLifecycle(forwardPath[index], forwardPath[index + 1]),
      ).toBe(true)
    }
    for (const status of forwardPath) {
      expect(canTransitionVenueBookingLifecycle(status, "cancelled")).toBe(true)
    }
    expect(VENUE_BOOKING_LIFECYCLE_TERMINAL_STATUSES).toEqual(["cancelled"])
    expect(getVenueBookingLifecycleTransitions("cancelled")).toEqual([])
  })

  it("maintains the legacy compatibility field", () => {
    expect(mapLifecycleToLegacyBookingStatus("contract")).toBe("pending")
    expect(mapLifecycleToLegacyBookingStatus("confirmed")).toBe("approved")
    expect(mapLifecycleToLegacyBookingStatus("cancelled")).toBe("cancelled")
  })
})
