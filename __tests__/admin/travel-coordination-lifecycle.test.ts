import { describe, expect, it } from "vitest"

import {
  formatAutoCoordinateMessage,
  segmentPresenceLabel,
  summarizeAutoCoordinateDrafts,
  toCoordinationLifecycle,
} from "@/lib/admin/travel-coordination-lifecycle"

describe("TRAVEL-104 travel coordination lifecycle", () => {
  it("maps legacy statuses into suggestion/review/request/hold/confirmed", () => {
    expect(toCoordinationLifecycle("pending")).toBe("review")
    expect(toCoordinationLifecycle("flights_booked")).toBe("request")
    expect(toCoordinationLifecycle("complete")).toBe("confirmed")
    expect(toCoordinationLifecycle("hold")).toBe("hold")
    expect(toCoordinationLifecycle("suggestion")).toBe("suggestion")
  })

  it("summarizes auto-coordinate drafts without claiming bookings", () => {
    const drafts = summarizeAutoCoordinateDrafts(["timeline_review", "ground_transport_draft"])
    expect(drafts).toHaveLength(2)
    expect(drafts[0].lifecycle).toBe("review")
    expect(drafts[1].label).toMatch(/unconfirmed/i)
  })

  it("formats auto-coordinate messages truthfully", () => {
    const message = formatAutoCoordinateMessage({
      groupName: "Crew A",
      draftsCreated: ["timeline_review", "ground_transport_draft"],
    })
    expect(message).toMatch(/Opened coordination review/)
    expect(message).not.toMatch(/have been arranged/i)
    expect(message).toMatch(/Confirm flights/)
  })

  it("labels segment presence without implying confirmation", () => {
    expect(segmentPresenceLabel({ count: 2, confirmedCount: 0, noun: "flights" })).toMatch(
      /unconfirmed/,
    )
    expect(segmentPresenceLabel({ count: 2, confirmedCount: 2, noun: "flights" })).toMatch(
      /confirmed/,
    )
  })
})
