import { describe, expect, it } from "vitest"

import { canonicalizeAdminParams } from "@/lib/admin/navigation/admin-route-state"

describe("Admin canonical URL state", () => {
  it("reads legacy aliases but emits canonical keys", () => {
    const params = canonicalizeAdminParams(new URLSearchParams("tour_id=tour-1&event_id=event-1&view_mode=table"))

    expect(params.get("tourId")).toBe("tour-1")
    expect(params.get("eventId")).toBe("event-1")
    expect(params.get("density")).toBe("table")
    expect(params.has("tour_id")).toBe(false)
    expect(params.has("event_id")).toBe(false)
    expect(params.has("view_mode")).toBe(false)
  })

  it("preserves an explicit canonical value over a legacy alias", () => {
    const params = canonicalizeAdminParams(new URLSearchParams("tour_id=legacy&tourId=canonical"))

    expect(params.get("tourId")).toBe("canonical")
    expect(params.has("tour_id")).toBe(false)
  })
})
