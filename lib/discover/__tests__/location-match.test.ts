import {
  buildLocationOrFilter,
  isEventsV2PubliclyListable,
  matchesLocationFields,
  mergeEventSourcesSoft,
  sortEventsByLocationBoost,
  tokenizeLocation,
} from "@/lib/discover/location-match"

describe("discover location match", () => {
  it("tokenizes City, State locations", () => {
    expect(tokenizeLocation("Austin, Texas")).toEqual(["austin", "texas"])
  })

  it("matches Austin, Texas against city Austin / state Texas", () => {
    expect(matchesLocationFields("Austin, Texas", "Austin", "TX")).toBe(true)
    expect(matchesLocationFields("Austin, Texas", "Austin", "Texas")).toBe(true)
    expect(matchesLocationFields("Nashville, Tennessee", "Chicago", "IL")).toBe(false)
    expect(matchesLocationFields("Los Angeles, California", "Los Angeles", "CA")).toBe(
      true
    )
  })

  it("does not wipe matches when using the combined geocode string", () => {
    const events = [
      {
        id: "1",
        venue_city: "Austin",
        venue_state: "Texas",
        attendance: { total: 2 },
        event_date: "2026-08-01",
      },
      {
        id: "2",
        venue_city: "Nashville",
        venue_state: "Tennessee",
        attendance: { total: 5 },
        event_date: "2026-07-20",
      },
    ]

    const boosted = sortEventsByLocationBoost(events, "Austin, Texas")
    expect(boosted[0]?.id).toBe("1")
    expect(boosted).toHaveLength(2)
  })

  it("builds tokenized or filters for SQL columns", () => {
    const filter = buildLocationOrFilter("Austin, Texas", ["city", "state"])
    expect(filter).toContain("city.ilike.%austin%")
    expect(filter).toContain("state.ilike.%texas%")
    expect(filter).not.toContain("%Austin, Texas%")
  })

  it("soft-merges event sources when one source fails", () => {
    const merged = mergeEventSourcesSoft([
      [{ id: "a" }],
      null,
      undefined,
      [{ id: "b" }],
    ])
    expect(merged).toEqual([{ id: "a" }, { id: "b" }])
  })

  it("excludes private events_v2 settings from public listing", () => {
    expect(isEventsV2PubliclyListable({ settings: { visibility: "private" } })).toBe(
      false
    )
    expect(isEventsV2PubliclyListable({ settings: { is_public: false } })).toBe(false)
    expect(isEventsV2PubliclyListable({ settings: { venue_city: "Austin" } })).toBe(
      true
    )
  })
})
