import {
  isVenueProfileOwner,
  toPublicVenueProfile,
  type PublicVenueProfile,
} from "@/lib/venue/venue-profile-contract"

/**
 * VEN-009/VEN-010 — typed venue profile contract tests.
 */

const FULL_ROW = {
  id: "vp-1",
  user_id: "owner-uuid",
  main_profile_id: null,
  email: "owner@private.example",
  venue_name: "The Fillmore",
  url_slug: "the-fillmore",
  description: "Historic venue.",
  address: "1 Private St",
  postal_code: "48201",
  city: "Detroit",
  state: "MI",
  country: "USA",
  capacity: 1800,
  venue_types: ["Music Venue"],
  amenities: ["bar"],
  contact_info: { booking_email: "book@venue.example", phone: "+1-555-0100" },
  social_links: { instagram: "https://instagram.com/fillmore" },
  settings: { show_contact_info: false },
  avatar_url: null,
  cover_image_url: null,
  verification_status: "verified",
  account_tier: "pro",
  sound_system: "d&b",
  lighting_rig: null,
  stage_dimensions: "12x8m",
  is_public: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
}

describe("VEN-009 — public venue contract", () => {
  const pub = toPublicVenueProfile(FULL_ROW)

  it("exposes every required public field", () => {
    for (const key of [
      "id",
      "venue_name",
      "url_slug",
      "description",
      "city",
      "state",
      "country",
      "capacity",
      "venue_types",
      "verification_status",
      "account_tier",
      "is_public",
      "created_at",
    ] as const) {
      expect(pub[key]).toBeDefined()
    }
  })

  it("never leaks owner identity, settings, street address, contacts, or email", () => {
    const serialized = JSON.stringify(pub)
    for (const forbidden of [
      "owner-uuid",
      "owner@private.example",
      "1 Private St",
      "48201",
      "book@venue.example",
      "+1-555-0100",
      "show_contact_info",
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
    expect(pub).not.toHaveProperty("user_id")
    expect(pub).not.toHaveProperty("main_profile_id")
    expect(pub).not.toHaveProperty("settings")
    expect(pub).not.toHaveProperty("contact_info")
    expect(pub).not.toHaveProperty("address")
    expect(pub).not.toHaveProperty("postal_code")
    expect(pub).not.toHaveProperty("email")
  })

  it("defaults missing primitives without inventing data", () => {
    const minimal = toPublicVenueProfile({ id: "vp-2", venue_name: "Bare Venue" })
    expect(minimal.is_public).toBe(true) // publish flag defaults open; RLS/API gate reality
    expect(minimal.url_slug).toBe("bare-venue")
    expect((minimal as Partial<PublicVenueProfile>).city ?? null).toBeNull()
  })
})

describe("VEN-010 — owner/private boundary", () => {
  it("identifies owners by direct or main-profile linkage only", () => {
    expect(isVenueProfileOwner(FULL_ROW, "owner-uuid")).toBe(true)
    expect(isVenueProfileOwner({ ...FULL_ROW, main_profile_id: "main-9" }, "main-9")).toBe(true)
    expect(isVenueProfileOwner(FULL_ROW, "stranger")).toBe(false)
    expect(isVenueProfileOwner(FULL_ROW, null)).toBe(false)
  })
})
