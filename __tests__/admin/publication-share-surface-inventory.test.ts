import { describe, expect, it } from "vitest"

import {
  assertScopedShareUrl,
  isMisleadingAdminShareUrl,
  listPublicationShareSurfaces,
  resolveAdvanceShareNotificationUrl,
} from "@/lib/admin/publication-share-surface-inventory"

describe("PUB-208 replace private Admin URL copy", () => {
  it("flags Admin dashboard URLs as misleading share targets", () => {
    expect(
      isMisleadingAdminShareUrl("https://app.tourify.live/admin/dashboard/events/abc"),
    ).toBe(true)
    expect(
      isMisleadingAdminShareUrl("/admin/dashboard/tours/11111111-1111-4111-8111-111111111111"),
    ).toBe(true)
    expect(isMisleadingAdminShareUrl("/api/admin/tours/x/publish")).toBe(true)
  })

  it("allows scoped publication, advance, and map share paths", () => {
    expect(isMisleadingAdminShareUrl("/p/abcTokenValue")).toBe(false)
    expect(isMisleadingAdminShareUrl("https://app.tourify.live/advance/tok")).toBe(false)
    expect(isMisleadingAdminShareUrl("/site-maps/shared/tok")).toBe(false)
    expect(assertScopedShareUrl("/p/secure-token").ok).toBe(true)
    expect(assertScopedShareUrl("/admin/dashboard/events/1")).toMatchObject({
      ok: false,
      reason: "misleading_admin_url",
    })
  })

  it("never falls back to Admin advancing URLs in notifications", () => {
    expect(
      resolveAdvanceShareNotificationUrl({
        shareToken: "tok-1",
        eventId: "evt-1",
      }),
    ).toBe("/advance/tok-1")
    expect(
      resolveAdvanceShareNotificationUrl({
        shareToken: null,
        eventId: "evt-1",
      }),
    ).toBeNull()
  })

  it("inventories tour/event/advance/map/day-sheet share surfaces", () => {
    const surfaces = listPublicationShareSurfaces()
    expect(surfaces.map((row) => row.id).sort()).toEqual([
      "advance",
      "day_sheet",
      "event",
      "map",
      "tour",
    ])
    expect(surfaces.every((row) => row.publicPathPrefix.startsWith("/"))).toBe(true)
    expect(surfaces.some((row) => row.shareMechanism === "publication_share_link")).toBe(true)
  })
})
