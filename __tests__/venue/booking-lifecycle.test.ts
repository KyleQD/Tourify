import { describe, expect, it } from "vitest"
import {
  canTransitionVenueBookingLifecycle,
  mapLegacyBookingStatus,
  mapLifecycleToLegacyBookingStatus,
  resolveVenueBookingLifecycleStatus,
} from "@/lib/venue/booking-lifecycle"

describe("venue booking lifecycle compatibility", () => {
  it("maps legacy records without rewriting stored values", () => {
    expect(mapLegacyBookingStatus("pending")).toBe("inquiry")
    expect(mapLegacyBookingStatus("approved")).toBe("confirmed")
    expect(mapLegacyBookingStatus("rejected")).toBe("cancelled")
  })

  it("prefers canonical lifecycle values when present", () => {
    expect(
      resolveVenueBookingLifecycleStatus({
        status: "pending",
        lifecycle_status: "contract",
      }),
    ).toBe("contract")
  })

  it("allows only reviewed lifecycle transitions", () => {
    expect(canTransitionVenueBookingLifecycle("inquiry", "hold")).toBe(true)
    expect(canTransitionVenueBookingLifecycle("inquiry", "confirmed")).toBe(false)
    expect(canTransitionVenueBookingLifecycle("cancelled", "inquiry")).toBe(false)
  })

  it("maintains the legacy compatibility field", () => {
    expect(mapLifecycleToLegacyBookingStatus("contract")).toBe("pending")
    expect(mapLifecycleToLegacyBookingStatus("confirmed")).toBe("approved")
    expect(mapLifecycleToLegacyBookingStatus("cancelled")).toBe("cancelled")
  })
})
