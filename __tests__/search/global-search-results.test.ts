import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GlobalSearchResponse, GlobalSearchResult } from "@/lib/search/global-search-types"
import { GlobalSearchResults } from "@/components/search/global-search-results"

const push = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/lib/analytics/ux-event-client", () => ({ trackDashboardUxEvent: vi.fn() }))

function baseResult(overrides: Partial<GlobalSearchResult> & Pick<GlobalSearchResult, "key" | "id" | "kind" | "category" | "title" | "href">): GlobalSearchResult {
  return {
    description: null,
    imageUrl: null,
    ownerUserId: null,
    ownerAccountId: null,
    relationship: "none",
    relationshipLabel: null,
    verified: false,
    subtitle: null,
    date: null,
    ...overrides,
  }
}

const results: GlobalSearchResult[] = [
  baseResult({
    key: "profile:1", id: "1", kind: "profile", category: "profiles", title: "Alex Rivera", href: "/profile/alex",
    profileType: "service", ownerUserId: "user-1", ownerAccountId: "account-1", description: "Tour photographer",
    metadata: { kind: "profile", handle: "alex", profileType: "service", location: "Los Angeles, CA" },
    relationshipAction: { kind: "friend", status: "none", requiresAuthentication: true },
  }),
  baseResult({
    key: "event:1", id: "2", kind: "event", category: "events", title: "Summer Stage", href: "/events/summer",
    metadata: { kind: "event", venue: "The Echo", location: "Los Angeles, CA", startsAt: "2026-08-12" },
  }),
  baseResult({
    key: "tour:1", id: "3", kind: "tour", category: "tours", title: "West Coast Run", href: "/tours/west-coast",
    metadata: { kind: "tour", startsAt: "2026-09-01", endsAt: "2026-09-15", showCount: 8 },
  }),
  baseResult({
    key: "music:1", id: "4", kind: "album", category: "music", title: "Afterglow", href: "/music?item=4",
    metadata: { kind: "music", releaseType: "album", genre: "Indie", releasedAt: "2026-07-01" },
  }),
  baseResult({
    key: "post:1", id: "5", kind: "post", category: "posts", title: "Maya's post", href: "/posts/5",
    description: "Looking for an opener in Portland.",
    metadata: { kind: "post", authorName: "Maya", authorHandle: "maya", authorImageUrl: null, mediaThumbnailUrl: null, createdAt: "2026-08-01T12:00:00Z", likes: 12, comments: 4, shares: 1 },
  }),
  baseResult({
    key: "job:1", id: "6", kind: "job", category: "jobs", title: "Tour Manager", href: "/jobs/6",
    metadata: { kind: "job", position: "Tour Manager", location: "Remote", remote: true, urgent: true, source: "artist", postedAt: "2026-07-31T12:00:00Z" },
  }),
]

function response(): GlobalSearchResponse {
  const totals = { profiles: 1, events: 1, tours: 1, music: 1, posts: 1, jobs: 1 }
  return {
    query: "tour",
    category: "all",
    profileType: "all",
    items: results,
    sections: (Object.keys(totals) as Array<keyof typeof totals>).map(category => ({
      category,
      items: results.filter(result => result.category === category),
      total: 1,
    })),
    totals,
    nextCursor: null,
    unavailableCategories: [],
    durationMs: 10,
  }
}

describe("GlobalSearchResults", () => {
  beforeEach(() => push.mockReset())

  it("renders polished grouped sections and category-specific metadata", () => {
    const html = renderToStaticMarkup(React.createElement(GlobalSearchResults, { initialResponse: response() }))

    expect(html).toContain("Results for")
    expect(html).toContain("The Echo")
    expect(html).toContain("8 shows")
    expect(html).toContain("Indie")
    expect(html).toContain("Looking for an opener")
    expect(html).toContain("Hiring now")
    expect(html).toContain('href="/events/summer"')
  })

  it("shows the correct anonymous friendship action for service profiles", () => {
    const html = renderToStaticMarkup(React.createElement(GlobalSearchResults, { initialResponse: response() }))

    expect(html).toContain("Service provider")
    expect(html).toContain("Sign in to connect")
    expect(html).toContain("redirectTo=%2Fsearch%3Fq%3Dtour")
  })
})
