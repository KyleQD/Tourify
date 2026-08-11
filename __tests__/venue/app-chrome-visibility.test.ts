import { describe, expect, it } from "vitest"

import { getAppChromeVisibility } from "@/lib/routing/app-chrome-visibility"

describe("Venue app chrome ownership", () => {
  it("gives VenueOperationsShell exclusive navigation and player chrome", () => {
    expect(getAppChromeVisibility("/venue/dashboard")).toMatchObject({
      hideRootNav: true,
      hidePlayer: true,
      isVenueRoute: true,
    })
    expect(getAppChromeVisibility("/venue/events/event-1/check-in")).toMatchObject({
      hideRootNav: true,
      hidePlayer: true,
    })
  })

  it("preserves global chrome on public venue pages", () => {
    expect(getAppChromeVisibility("/venues/the-echo")).toMatchObject({
      hideRootNav: false,
      hidePlayer: false,
      isVenueRoute: false,
    })
  })
})
