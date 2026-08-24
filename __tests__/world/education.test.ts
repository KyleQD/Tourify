/**
 * P20 — educational world tests: Instrument Atlas contract, Time Machine
 * era filtering, journey schema + AI-draft publication gate, educator
 * hooks, and the five seeded journeys validating end-to-end.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { validateAtlasEntry, type InstrumentAtlasEntry } from "@/lib/world/education/atlas"
import { boundsForEra, itemMatchesEra } from "@/lib/world/education/time-machine"
import {
  isJourneyComplete,
  markStopComplete,
  publicationReadiness,
  validateJourney,
  type JourneyStop,
  type MusicJourney,
} from "@/lib/world/education/journeys"

describe("P20-T01 instrument atlas", () => {
  const entry: InstrumentAtlasEntry = {
    key: "cuban_tres",
    name: "Tres",
    family: "strings",
    originPlaceKey: "cu/havana",
    originEra: "19th century",
    construction: "Nine strings in three courses on a small guitar-like body.",
    technique: "Syncopated guajeo pattern picked with a thumb pick.",
    approvedSoundDemoMediaId: "media_asset_tres_demo",
    traditions: ["son", "changüí"],
    genres: ["son cubano"],
    geographyPlaceKeys: ["havana"],
    performerArtistRefs: ["havana_arsenio_rodriguez"],
    timeline: [
      { label: "Emerges in eastern Cuba", era: "19th century" },
      { label: "Conjunto era standardization", year: 1940 },
    ],
    sourceKeys: ["museo_nacional_musica_cuba"],
  }

  it("accepts a complete, source-backed entry", () => {
    expect(validateAtlasEntry(entry)).toEqual({ ok: true })
  })

  it("rejects missing sources and URL-shaped demo ids", () => {
    expect(validateAtlasEntry({ ...entry, sourceKeys: [] }).ok).toBe(false)
    expect(validateAtlasEntry({ ...entry, approvedSoundDemoMediaId: "https://cdn/x.mp3" }).ok).toBe(false)
    expect(validateAtlasEntry({ ...entry, timeline: [{ label: "x" }] }).ok).toBe(false)
  })
})

describe("P20-T02 time machine eras", () => {
  it("matches dated items inclusively against era windows", () => {
    expect(itemMatchesEra({ startYear: 1959 }, "1950s-1960s")).toBe(true)
    expect(itemMatchesEra({ startYear: 1928, endYear: 1931 }, "1930s-1940s")).toBe(true) // overlap
    expect(itemMatchesEra({ startYear: 1997 }, "pre-1900")).toBe(false)
    expect(boundsForEra("2010s-now").fromYear).toBe(2010)
    expect(boundsForEra("pre-1900").toYear).toBe(1899)
  })

  it("never invents dates for undated content — coarse era text must match explicitly", () => {
    expect(itemMatchesEra({ startYear: null, era: "19th century" }, "pre-1900")).toBe(false)
    // Undated content simply does not appear under precise era filters.
    expect(itemMatchesEra({ startYear: undefined }, "1900s-1920s")).toBe(false)
  })
})

function journeyWith(stopsOverrides?: Partial<JourneyStop>): MusicJourney {
  const stop = (order: number): JourneyStop => ({
    order,
    placeKey: "detroit",
    title: `Stop ${order}`,
    narration: "Approved narration.",
    narrationOrigin: "human_approved",
    mediaIds: [],
    claimRefs: ["detroit_historical_atkins"],
    ...stopsOverrides,
  })
  return {
    key: "birth-of-techno",
    title: "Birth of Techno",
    summary: "Belleville to Berlin.",
    stops: [stop(0), stop(1)],
    shareUrlPath: "/discover/world/journeys/birth-of-techno",
    educator: {
      citations: ["detroit_historical_atkins"],
      vocabulary: [{ term: "techno", definition: "Detroit's machine-funk." }],
      furtherReading: ["Energy Flash"],
    },
  }
}

describe("P20-T03/T07/T08 journeys", () => {
  it("validates ordered stops with claim refs and canonical media ids", () => {
    expect(validateJourney(journeyWith())).toEqual({ ok: true })
    expect(validateJourney({ ...journeyWith(), stops: [journeyWith().stops[0]] }).ok).toBe(false)
    const badOrder = journeyWith()
    badOrder.stops[1].order = 5
    expect(validateJourney(badOrder).ok).toBe(false)
    const noClaims = journeyWith()
    noClaims.stops[0].claimRefs = []
    expect(validateJourney(noClaims).ok).toBe(false)
    const urlMedia = journeyWith()
    urlMedia.stops[0].mediaIds = ["https://cdn/audio.mp3"]
    expect(validateJourney(urlMedia).ok).toBe(false)
  })

  it("blocks publishing while any narration remains an unapproved AI draft (P20-T08)", () => {
    const draft = journeyWith()
    draft.stops[1].narrationOrigin = "ai_draft"
    const readiness = publicationReadiness(draft)
    expect(readiness.publishable).toBe(false)
    expect(readiness.blockingStops).toEqual([1])

    const approved = journeyWith()
    approved.stops.forEach((s) => (s.narrationOrigin = "human_approved"))
    expect(publicationReadiness(approved).publishable).toBe(true)
  })

  it("tracks learner completion privately and correctly", () => {
    let progress = { journeyKey: "j", completedStopOrders: [], startedAt: null, completedAt: null }
    progress = markStopComplete(progress, 0, "2026-08-23T00:00:00Z")
    expect(isJourneyComplete(progress, 2)).toBe(false)
    progress = markStopComplete(progress, 1, "2026-08-23T01:00:00Z")
    expect(isJourneyComplete(progress, 2)).toBe(true)
  })
})

describe("P20-T04 seeded journeys validate end-to-end", () => {
  const file = path.join(process.cwd(), "data", "world", "reference", "journeys.json")
  const bundle = JSON.parse(readFileSync(file, "utf8")) as { journeys: MusicJourney[] }

  it("contains the five required curricula, each structurally valid and publishable", () => {
    const keys = bundle.journeys.map((j) => j.key)
    for (const required of [
      "birth-of-techno", "kingston-to-london", "evolution-of-hip-hop", "origins-of-house", "afrobeats-and-diaspora",
    ]) {
      expect(keys).toContain(required)
    }
    for (const journey of bundle.journeys) {
      const result = validateJourney(journey)
      if (!result.ok) throw new Error(`${journey.key}: ${result.error}`)
      expect(publicationReadiness(journey).publishable).toBe(true)
      expect(journey.shareUrlPath.startsWith("/discover/world/journeys/")).toBe(true)
    }
  })
})
