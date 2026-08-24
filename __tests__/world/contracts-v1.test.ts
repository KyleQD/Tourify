/**
 * P2-T09 contract tests — the registry is fail-closed.
 * Arbitrary relation/entity strings, out-of-range confidence, illegal
 * visibility/lifecycle transitions, and cross-domain projections must all be
 * rejected here rather than coerced somewhere downstream.
 */
import { describe, expect, it } from "vitest"

import {
  RELATION_REGISTRY,
  canPublish,
  canTransitionPublication,
  canTransitionReview,
  canTransitionVisibility,
  confidenceBand,
  isEntityKind,
  isValidRelation,
} from "@/lib/world/contracts/v1"
import {
  WORLD_EDITORIAL_CANDIDATE_V1,
  WORLD_PLACE_RESPONSE_V2,
  WORLD_RANKING_V1,
  WORLD_SEARCH_RESULT_V1,
  WORLD_SIGNAL_V1,
  WORLD_VIEWPORT_PAYLOAD_V1,
} from "@/lib/world/contracts/v2-payloads"

describe("relation registry (P2-T01/T02)", () => {
  it("accepts every retained migration-seeded pair", () => {
    expect(isValidRelation("artist_place", "based_in")).toBe(true)
    expect(isValidRelation("artist_place", "active_in")).toBe(true)
    expect(isValidRelation("track_place", "recorded_in")).toBe(true)
    expect(isValidRelation("radio_place", "serves")).toBe(true)
    expect(isValidRelation("cultural_graph", "influenced_by")).toBe(true)
  })

  it("accepts newly frozen Wave-2 pairs", () => {
    expect(isValidRelation("event_place", "occurs_in")).toBe(true)
    expect(isValidRelation("org_place", "headquartered_in")).toBe(true)
    expect(isValidRelation("content_place", "about_place")).toBe(true)
  })

  it("rejects arbitrary/invented relation strings (fail closed)", () => {
    expect(isValidRelation("artist_place", "vibes_with")).toBe(false)
    expect(isValidRelation("vibe_place", "based_in")).toBe(false)
    expect(isValidRelation("", "")).toBe(false)
    // Cross-domain reuse without registration is rejected:
    expect(isValidRelation("artist_place", "serves")).toBe(false)
    expect(isValidRelation("radio_place", "born_in")).toBe(false)
  })

  it("registry is frozen at runtime", () => {
    expect(Object.isFrozen(RELATION_REGISTRY)).toBe(true)
  })
})

describe("entity kinds (P2-T03)", () => {
  it("accepts known kinds and rejects arbitrary strings", () => {
    expect(isEntityKind("venue")).toBe(true)
    expect(isEntityKind("blog_article")).toBe(true)
    expect(isEntityKind("vibe")).toBe(false)
  })

  it("enforces projectable source tables per kind", async () => {
    const { canProject } = await import("@/lib/world/contracts/v1")
    expect(canProject("venue", "venues_v2")).toBe(true)
    expect(canProject("venue", "posts")).toBe(false)
    expect(canProject("artist", "artist_profiles")).toBe(true)
  })
})

describe("confidence semantics (P2-T04)", () => {
  it("bands numerically and rejects out-of-range input", () => {
    expect(confidenceBand(0.95)).toBe("accept")
    expect(confidenceBand(0.7)).toBe("review")
    expect(confidenceBand(0.3)).toBe("unresolved")
    expect(() => confidenceBand(1.5)).toThrow(RangeError)
    expect(() => confidenceBand(-0.1)).toThrow(RangeError)
  })
})

describe("visibility model (P2-T05)", () => {
  it("allows documented transitions and blocks silent widening loops", () => {
    expect(canTransitionVisibility("private", "public")).toBe(true)
    expect(canTransitionVisibility("public", "aggregate_only")).toBe(true)
    expect(canTransitionVisibility("aggregate_only", "public")).toBe(false)
    expect(canTransitionVisibility("aggregate_only", "private")).toBe(false)
  })
})

describe("lifecycle state machines (P2-T09)", () => {
  it("publish requires approved review + reviewer + draft origin", () => {
    expect(canPublish("approved", "draft", "published", "reviewer-1")).toBe(true)
    expect(canPublish("needs_review", "draft", "published", "reviewer-1")).toBe(false)
    expect(canPublish("approved", "retired", "published", "reviewer-1")).toBe(false)
    expect(canPublish("approved", "draft", "published", null)).toBe(false)
  })

  it("blocks incompatible review/publication transitions", () => {
    expect(canTransitionReview("candidate", "approved")).toBe(false)
    expect(canTransitionReview("rejected", "approved")).toBe(false)
    expect(canTransitionPublication("retired", "published")).toBe(false)
    expect(canTransitionPublication("published", "draft")).toBe(false)
  })
})

describe("versioned payload contracts (P2-T08)", () => {
  it("pins schema version literals", () => {
    expect(WORLD_PLACE_RESPONSE_V2).toBe("world-place-v2.0")
    expect(WORLD_VIEWPORT_PAYLOAD_V1).toBe("world-viewport-v1.0")
    expect(WORLD_SEARCH_RESULT_V1).toBe("world-search-v1.0")
    expect(WORLD_SIGNAL_V1).toBe("world-signal-v1.0")
    expect(WORLD_RANKING_V1).toBe("world-ranking-v1.0")
    expect(WORLD_EDITORIAL_CANDIDATE_V1).toBe("world-editorial-candidate-v1.0")
  })
})
