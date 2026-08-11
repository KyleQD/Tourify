import { describe, expect, it } from "vitest"

import {
  isVenueProfileOwner,
  parseVenueProfileUpdate,
  venueProfileResponse,
} from "@/lib/venue/venue-profile-contract"

describe("venue profile contract", () => {
  it("rejects mass-assignment fields and normalizes a canonical slug", () => {
    expect(
      parseVenueProfileUpdate({
        venue_name: "The Echo",
        user_id: "attacker",
      }).success,
    ).toBe(false)

    const result = parseVenueProfileUpdate({
      venue_name: "The Echo",
      capacity: 850,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.url_slug).toBe("the-echo")
  })

  it("recognizes both supported owner identities", () => {
    expect(isVenueProfileOwner({ user_id: "user-1" }, "user-1")).toBe(true)
    expect(isVenueProfileOwner({ main_profile_id: "user-1" }, "user-1")).toBe(true)
    expect(isVenueProfileOwner({ user_id: "user-2" }, "user-1")).toBe(false)
  })

  it("removes private operating settings and personal ownership from public data", () => {
    const result = venueProfileResponse(
      {
        id: "venue-1",
        user_id: "user-1",
        main_profile_id: "user-1",
        settings: { door_code: "1234" },
        contact_info: {
          booking_email: "booking@example.com",
          phone: "555-0100",
        },
      },
      false,
    )

    expect(result).not.toHaveProperty("settings")
    expect(result).not.toHaveProperty("user_id")
    expect(result.contact_info).toEqual({
      booking_email: "booking@example.com",
    })
  })
})
