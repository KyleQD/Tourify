/**
 * P22 — federated search, view-state mapping, recommendations, analytics.
 */
import { describe, expect, it } from "vitest"

import {
  parseSearchQuery,
  rankResults,
  resolvePlace,
  type SearchableItem,
} from "@/lib/world/search/federated-search"
import { resultToViewState } from "@/lib/world/search/view-state"
import { recommend } from "@/lib/world/search/recommendations"
import { sanitizeSearchAnalytics } from "@/lib/world/search/analytics"

const PLACES = [
  { key: "us/ga/atlanta", name: "Atlanta", aliases: ["atl"] },
  { key: "us/mi/detroit", name: "Detroit", aliases: ["motor city"] },
  { key: "jp/tokyo", name: "Tokyo", aliases: [] },
]

const ITEMS: SearchableItem[] = [
  { kind: "place", id: "us/mi/detroit", name: "Detroit", placePath: "us/mi/detroit" },
  { kind: "genre", id: "techno", name: "Techno", placePath: "us/mi/detroit", tags: ["electronic"] },
  { kind: "radio", id: "st-1", name:TokyoRadioName(), placePath: "jp/tokyo" },
  { kind: "event", id: "ev-1", name: "Movement Detroit", placePath: "us/mi/detroit" },
  { kind: "journey", id: "birth-of-techno", name: "Birth of Techno", tags: ["techno", "detroit"] },
]
function TokyoRadioName(): string { return "Tokyo Jukebox FM" }

describe("P22-T02/T03 query understanding", () => {
  it("resolves unique places by name or alias; ambiguous names fail closed", () => {
    expect(resolvePlace("detroit", PLACES)).toEqual({ key: "us/mi/detroit" })
    expect(resolvePlace("motor city", PLACES)).toEqual({ key: "us/mi/detroit" })
    expect(resolvePlace("georgia", [
      { key: "world/georgia-country", name: "Georgia", aliases: [] },
      { key: "us/ga", name: "Georgia", aliases: [] },
    ])).toBeNull() // ambiguous stays unresolved rather than guessed
    expect(resolvePlace("", PLACES)).toBeNull()
  })

  it("extracts compound intent: 'Detroit techno'", () => {
    const intent = parseSearchQuery("Detroit techno", PLACES)
    expect(intent.scopePlaceKey).toBe("us/mi/detroit")
    expect(intent.text).toBe("techno")
  })

  it("extracts 'events in Berlin' and 'Tokyo radio' patterns", () => {
    const events = parseSearchQuery("events in Berlin", [
      ...PLACES,
      { key: "de/berlin", name: "Berlin", aliases: [] },
    ])
    expect(events.scopePlaceKey).toBe("de/berlin")
    expect(events.requestedKinds).toContain("event")

    const radio = parseSearchQuery("Tokyo radio", PLACES)
    expect(radio.scopePlaceKey).toBe("jp/tokyo")
    expect(radio.requestedKinds).toContain("radio")
  })

  it("maps 'music history of Jamaica' to landmark results scoped by place", () => {
    const intent = parseSearchQuery("music history of Jamaica", [
      ...PLACES,
      { key: "jm", name: "Jamaica", aliases: [] },
    ])
    expect(intent.scopePlaceKey).toBe("jm")
    expect(intent.requestedKinds).toContain("landmark")
  })
})

describe("P22-T01/T05 ranking", () => {
  it("ranks exact/prefix matches above substrings with stable ties", () => {
    const intent = parseSearchQuery("detroit techno", [...PLACES])
    const results = rankResults(intent, ITEMS)
    expect(results[0].id).toBe("techno")
    expect(results.map((r) => r.id)).toEqual([...results].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map((r) => r.id))
  })

  it("demotes kinds the user did not ask for", () => {
    const intent = parseSearchQuery("Tokyo radio", PLACES)
    const results = rankResults(intent, ITEMS)
    expect(results.filter((r) => r.kind !== "radio").every((r) => r.score < 40)).toBe(true)
  })
})

describe("P22-T04 view-state mapping", () => {
  it("place results drive camera + panel; journeys open panels only", () => {
    const state = resultToViewState({ kind: "place", id: "us/mi/detroit", name: "Detroit", placePath: null, score: 1 })
    expect(state).toMatchObject({
      cameraTargetPlaceKey: "us/mi/detroit",
      selectedPlaceKey: "us/mi/detroit",
      activeLayer: "places",
      panel: { kind: "place", key: "us/mi/detroit" },
    })
    const journeyState = resultToViewState(
      { kind: "journey", id: "birth-of-techno", name: "x", placePath: null, score: 1 },
      { cameraTargetPlaceKey: "detroit" },
    )
    expect(journeyState.panel).toEqual({ kind: "journey", key: "birth-of-techno" })
    expect(journeyState.cameraTargetPlaceKey).toBe("detroit") // camera preserved
  })

  it("entity results scope to their owning place's layer", () => {
    const state = resultToViewState({ kind: "radio", id: "st-1", name: "FM", placePath: "jp/tokyo", score: 1 })
    expect(state.activeLayer).toBe("places")
    expect(state.selectedPlaceKey).toBe("tokyo")
  })
})

describe("P22-T06/T07 recommendations", () => {
  const candidates = [
    { key: "chicago", kind: "place" as const, name: "Chicago", sharedTags: ["house", "blues"] },
    { key: "kingston", kind: "place" as const, name: "Kingston", sharedTags: ["reggae"] },
    { key: "techno", kind: "genre" as const, name: "Techno", sharedTags: ["techno"] },
  ]

  it("derives from explicit follows/exploration with plain explanations", () => {
    const recs = recommend(
      {
        followedKeys: [],
        exploredPlaceKeys: ["detroit"],
        completedJourneyKeys: [],
        interestTags: ["techno", "detroit sound"],
      },
      candidates,
    )
    expect(recs.length).toBeGreaterThan(0)
    for (const rec of recs) {
      expect(rec.explanation).toMatch(/^Because you/)
      // No sensitive-location inference: explanations cite interest tags, not coordinates.
      expect(rec.explanation).not.toMatch(/\d+\.\d+|lat|lng/i)
    }
  })

  it("excludes already-known keys", () => {
    const recs = recommend(
      { followedKeys: ["chicago"], exploredPlaceKeys: [], completedJourneyKeys: [] },
      candidates,
    )
    expect(recs.some((r) => r.candidate.key === "chicago")).toBe(false)
  })
})

describe("P22-T08 search analytics minimization", () => {
  it("stores normalized tokens and buckets — never raw queries or identity", () => {
    const stored = sanitizeSearchAnalytics(
      { intentTokens: ["detroit", "techno"], requestedKinds: [], resultCount: 3, outcome: "results", scopePlaceKey: "us/mi/detroit" },
      "2026-08-23T00:00:00Z",
    )
    expect(stored).toMatchObject({
      intentTokens: ["detroit", "techno"],
      resultCountBucket: "1-5",
      outcome: "results",
    })
    expect(stored && JSON.stringify(stored).includes("Detroit techno")).toBe(false)
  })

  it("rejects identity-bearing payloads and malformed inputs", () => {
    expect(sanitizeSearchAnalytics({ intentTokens: ["x"], resultCount: 1, outcome: "results", ip: "1.2.3.4" }, "t")).toBeNull()
    expect(sanitizeSearchAnalytics({ intentTokens: ["ok"], resultCount: -4, outcome: "zero_results" }, "t")).toBeNull()
    expect(sanitizeSearchAnalytics({ intentTokens: [], resultCount: 0, outcome: "zero_results" }, "t")).toBeNull()
  })
})
