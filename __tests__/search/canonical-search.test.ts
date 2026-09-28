import { describe, expect, it } from "vitest"
import { CANONICAL_SEARCH_RATE_LIMIT, parseCanonicalSearchRequest } from "@/lib/search/canonical-search"

describe("canonical search request", () => {
  it("uses the FTS contract and bounds the result window", () => {
    expect(parseCanonicalSearchRequest(new URLSearchParams("q=live+music&category=profiles&profileType=artist&limit=100"))).toEqual({
      query: "live music", category: "profiles", profileType: "artist", limit: 50, cursor: null,
    })
  })

  it("maps legacy type filters into the canonical contract", () => {
    expect(parseCanonicalSearchRequest(new URLSearchParams("type=venues&limit=0"))).toMatchObject({
      category: "profiles", profileType: "venue", limit: 1,
    })
  })

  it("shares one rate-limit bucket across canonical and compatibility routes", () => {
    expect(CANONICAL_SEARCH_RATE_LIMIT).toEqual({ namespace: "search", limit: 60, windowSec: 60 })
  })
})
