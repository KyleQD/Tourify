import { describe, expect, it } from "vitest"

import { hasMergeDisqualifier, scoreMatch } from "@/lib/events/event-matcher"

describe("scoreMatch", () => {
  it("scores exact title + date + venue + time at 1.0", () => {
    const { confidence, reasons } = scoreMatch(
      { normalizedTitle: "example band live", localDate: "2026-09-04", venueName: "The Example Theater", startTime: "19:00:00" },
      { normalizedTitle: "example band live", eventDate: "2026-09-04", venueName: "Example Theater", startTime: "19:00" },
    )
    expect(confidence).toBeCloseTo(1.0)
    expect(reasons).toContain("exact_normalized_title")
    expect(reasons).toContain("same_local_date")
    expect(reasons).toContain("same_venue")
    expect(reasons).toContain("same_start_time")
  })

  it("scores title-only matches below the review threshold", () => {
    const { confidence } = scoreMatch(
      { normalizedTitle: "trivia night", localDate: null, venueName: null, startTime: null },
      { normalizedTitle: "trivia night", eventDate: "2026-09-04", venueName: "Bar", startTime: "20:00" },
    )
    expect(confidence).toBeLessThan(0.6)
  })
})

describe("hasMergeDisqualifier", () => {
  const base = { normalizedTitle: "band live", startTime: "19:00:00" }

  it("blocks different venues", () => {
    expect(hasMergeDisqualifier(base, base, false)).toBe("different_venues")
  })

  it("blocks festival pass vs single-day", () => {
    expect(
      hasMergeDisqualifier(
        { normalizedTitle: "desert fest weekend pass", startTime: "12:00:00" },
        { normalizedTitle: "desert fest friday", startTime: "12:00:00" },
        true,
      ),
    ).toBe("festival_vs_single_day")
  })

  it("blocks livestream vs in-person", () => {
    expect(
      hasMergeDisqualifier(
        { normalizedTitle: "band livestream", startTime: "19:00:00" },
        { normalizedTitle: "band live", startTime: "19:00:00" },
        true,
      ),
    ).toBe("livestream_vs_in_person")
  })

  it("blocks possible matinee/evening split at the same venue", () => {
    expect(
      hasMergeDisqualifier(
        { normalizedTitle: "band live", startTime: "14:00:00" },
        { normalizedTitle: "band live", startTime: "20:00:00" },
        true,
      ),
    ).toBe("possible_matinee_evening_split")
  })

  it("allows same venue, same time, same kind", () => {
    expect(hasMergeDisqualifier(base, base, true)).toBeNull()
  })
})
