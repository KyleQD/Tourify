import { computeVenueCompletion } from "../completion"

describe("computeVenueCompletion (VEN-015)", () => {
  it("returns zero with an empty checklist for null/invalid profiles", () => {
    expect(computeVenueCompletion(null)).toEqual({ score: 0, isReady: false, checklist: [] })
    expect(computeVenueCompletion("nope" as never)).toEqual({
      score: 0,
      isReady: false,
      checklist: [],
    })
  })

  it("is not permanently zero for a real, partially filled row", () => {
    const result = computeVenueCompletion({
      venue_name: "The Echo",
      url_slug: "the-echo",
      city: "Los Angeles",
      state: "CA",
      venue_types: ["Club"],
      capacity: 350,
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
    expect(result.checklist.length).toBeGreaterThan(5)
  })

  it("reaches 100 when every weighted field is present", () => {
    const result = computeVenueCompletion({
      venue_name: "The Echo",
      url_slug: "the-echo",
      description: "A legendary mid-size club in Echo Park hosting live music seven nights a week.",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      venue_types: ["Club"],
      capacity: 350,
      capacity_total: 350,
      avatar_url: "https://cdn.example.com/avatar.jpg",
      cover_image_url: "https://cdn.example.com/cover.jpg",
      amenities: ["wifi", "green_room", "sound_system", "ada_accessible"],
      stage_dimensions: "24x16",
      sound_system: "d&b audiotechnik",
      lighting_rig: "Full DMX",
      social_links: { website: "https://theecho.com" },
      settings: {
        booking_email: "bookings@theecho.com",
        operational_policies: { setup_time: "4 hours", insurance_required: true },
      },
    })
    expect(result.score).toBe(100)
    expect(result.isReady).toBe(true)
  })

  it("is deterministic — identical rows produce identical scores", () => {
    const profile = {
      venue_name: "Half-filled Hall",
      description: "Short",
      city: "Austin",
      venue_types: ["Theater"],
    }
    const a = computeVenueCompletion(profile)
    const b = computeVenueCompletion({ ...profile })
    expect(a.score).toBe(b.score)
    expect(a.checklist.map((c) => c.done)).toEqual(b.checklist.map((c) => c.done))
  })

  it("weights sum to exactly 100", () => {
    const { checklist } = computeVenueCompletion({ venue_name: "x" })
    expect(checklist.reduce((sum, c) => sum + c.weight, 0)).toBe(100)
  })

  it("marks ready only at the 70 threshold", () => {
    const partialProfile = {
      venue_name: "V",
      url_slug: "v",
      description: "A".repeat(50),
      city: "Austin",
      state: "TX",
      venue_types: ["Bar"],
      capacity: 50,
      avatar_url: "https://cdn.example.com/a.jpg",
    }
    const justUnder = computeVenueCompletion(partialProfile)
    expect(justUnder.score).toBe(65)
    expect(justUnder.isReady).toBe(false)

    // Adding cover (5) + three amenities (10) crosses the readiness line.
    const atThreshold = computeVenueCompletion({
      ...partialProfile,
      cover_image_url: "https://cdn.example.com/c.jpg",
      amenities: ["wifi", "bar_service", "security"],
    })
    expect(atThreshold.score).toBeGreaterThanOrEqual(70)
    expect(atThreshold.isReady).toBe(true)
  })
})
