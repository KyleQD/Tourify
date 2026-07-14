import { describe, expect, it } from "vitest"
import { buildEventSignupUrl } from "@/components/events/public/utils"
import type { EventData } from "@/components/events/public/types"

describe("buildEventSignupUrl", () => {
  const event = {
    id: "evt-1",
    slug: "summer-show",
    title: "Summer Show",
  } as EventData

  it("routes signed-out RSVP to signup with redirectTo", () => {
    expect(buildEventSignupUrl(event)).toBe(
      "/signup?redirectTo=%2Fevents%2Fsummer-show"
    )
  })

  it("includes intent for attending", () => {
    expect(buildEventSignupUrl(event, "attending")).toBe(
      "/signup?redirectTo=%2Fevents%2Fsummer-show&intent=attending"
    )
  })

  it("falls back to event id when slug missing", () => {
    const noSlug = { ...event, slug: "" }
    expect(buildEventSignupUrl(noSlug, "interested")).toBe(
      "/signup?redirectTo=%2Fevents%2Fevt-1&intent=interested"
    )
  })
})
