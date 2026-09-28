import { describe, expect, it } from "vitest"
import {
  dedupeSearchResults,
  encodeSearchCursor,
  escapePostgrestLike,
  normalizeSearchQuery,
  parseSearchCursor,
  postgresPrefixQuery,
  rankSearchResults,
} from "@/lib/search/global-search-ranking"
import type { GlobalSearchRelationship, RankedSearchResult } from "@/lib/search/global-search-types"

function result(overrides: Partial<RankedSearchResult> & { key: string; title: string }): RankedSearchResult {
  return {
    id: overrides.key,
    kind: "profile",
    category: "profiles",
    description: null,
    imageUrl: null,
    href: `/profile/${overrides.key}`,
    ownerUserId: null,
    ownerAccountId: null,
    relationship: "none",
    relationshipLabel: null,
    verified: false,
    subtitle: null,
    date: null,
    searchText: overrides.title,
    primaryText: overrides.title,
    engagement: 0,
    sortDate: null,
    ...overrides,
  }
}

describe("global search ranking", () => {
  it("normalizes unsafe, overlong, and spaced input", () => {
    expect(normalizeSearchQuery("  neon\u0000   pulse  ")).toBe("neon pulse")
    expect(normalizeSearchQuery("x".repeat(200))).toHaveLength(120)
    expect(postgresPrefixQuery("Neon Pulse!")).toBe("neon:* & pulse:*")
    expect(escapePostgrestLike("100%_live,(now)")).toBe("100\\%\\_live  now ")
  })

  it("keeps an exact match ahead of a connected weaker match", () => {
    const ranked = rankSearchResults([
      result({ key: "friend", title: "Neon Pulse Festival", relationship: "friend" }),
      result({ key: "exact", title: "Neon Pulse", relationship: "none" }),
    ], "neon pulse")
    expect(ranked.map(item => item.key)).toEqual(["exact", "friend"])
  })

  it.each<[GlobalSearchRelationship, GlobalSearchRelationship]>([
    ["friend", "following"], ["following", "follower"], ["follower", "none"],
  ])("uses relationship affinity within the same relevance tier: %s before %s", (first, second) => {
    const ranked = rankSearchResults([
      result({ key: second, title: "Neon Club", relationship: second }),
      result({ key: first, title: "Neon Room", relationship: first }),
    ], "neon")
    expect(ranked[0].relationship).toBe(first)
  })

  it("deduplicates canonical kind and id pairs", () => {
    const duplicate = result({ key: "one", id: "same", title: "First" })
    const second = result({ key: "two", id: "same", title: "Second" })
    expect(dedupeSearchResults([duplicate, second])).toEqual([duplicate])
  })

  it("round-trips opaque cursors and rejects malformed cursors", () => {
    const payload = { version: 1 as const, category: "profiles", profileType: "artist", lastKey: "profile:123" }
    expect(parseSearchCursor(encodeSearchCursor(payload))).toEqual(payload)
    expect(parseSearchCursor("not-a-cursor")).toBeNull()
  })
})
