import { describe, expect, it } from "vitest"

import {
  EVENT_PAGE_DEFAULT_SECTION_ORDER,
  getVisibleEventPageTabs,
  isDefaultEventPageLayout,
  normalizeEventPageLayout,
} from "@/lib/events/event-page-layout"

describe("normalizeEventPageLayout", () => {
  it("returns defaults for missing layouts", () => {
    const layout = normalizeEventPageLayout(null)
    expect(layout.section_order).toEqual(EVENT_PAGE_DEFAULT_SECTION_ORDER)
    expect(layout.section_visibility.hero).toBe(true)
    expect(layout.section_visibility.media).toBe(true)
    expect(isDefaultEventPageLayout(layout)).toBe(true)
  })

  it("preserves valid custom order and appends missing sections", () => {
    const layout = normalizeEventPageLayout({
      section_order: ["media", "hero", "overview"],
      section_visibility: { media: false, posts: false },
    })

    expect(layout.section_order.slice(0, 3)).toEqual(["media", "hero", "overview"])
    expect(layout.section_order).toEqual(["media", "hero", "overview", "posts", "attendance", "details"])
    expect(layout.section_visibility.media).toBe(false)
    expect(layout.section_visibility.posts).toBe(false)
    expect(layout.section_visibility.hero).toBe(true)
  })

  it("ignores duplicate and unknown sections", () => {
    const layout = normalizeEventPageLayout({
      section_order: ["posts", "unknown", "posts", "details"],
      section_visibility: { unknown: false, details: false },
    })

    expect(layout.section_order).toEqual(["posts", "details", "hero", "overview", "attendance", "media"])
    expect(layout.section_visibility.details).toBe(false)
    expect(layout.section_visibility.overview).toBe(true)
  })

  it("keeps overview available when every tab is hidden", () => {
    const layout = normalizeEventPageLayout({
      section_visibility: {
        overview: false,
        posts: false,
        attendance: false,
        details: false,
        media: false,
      },
    })

    expect(getVisibleEventPageTabs(layout)).toEqual(["overview"])
  })
})
