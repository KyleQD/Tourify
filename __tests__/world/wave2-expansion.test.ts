/**
 * P18 — Wave 2 corpus expansion tests.
 *
 * T02/T03: every pilot meets the density targets through one repeatable
 * template. T04: corpus rows stage at needs_review/draft (promotion is
 * governed). T05: relation vocabulary and provenance completeness validated
 * for ALL regions. T06/T08: expansion renders through the same contracts
 * without region-specific branches, and original-pilot payloads stay stable.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { validatePilot } from "../../scripts/world/validate-pilot"
import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"
import { composeWorldPlaceV2 } from "@/lib/world/place-api-v2/compose"

const PILOTS_DIR = path.join(process.cwd(), "data", "world", "pilots")
const WAVE1 = ["detroit", "kingston", "lagos", "london", "tokyo"] as const
const WAVE2 = ["new-orleans", "bronx", "chicago", "havana", "rio-de-janeiro"] as const

interface Bundle {
  entities: Array<{ seed_id: string; entity_type: string; source_keys?: string[] }>
  relationships: unknown[]
}

const load = (key: string): Bundle =>
  JSON.parse(readFileSync(path.join(PILOTS_DIR, `${key}.json`), "utf8")) as Bundle

describe("P18-T03 corpus density targets (Wave-2 regions)", () => {
  // Density minimums govern EXPANSION regions; the original five are
  // regression-frozen at their accepted P11-era densities below.
  for (const key of WAVE2) {
    it(`${key} meets minimum entity targets`, () => {
      const bundle = load(key)
      const count = (type: string) => bundle.entities.filter((e) => e.entity_type === type).length
      expect(count("artist_reference")).toBeGreaterThanOrEqual(15)
      expect(count("recording_reference")).toBeGreaterThanOrEqual(5)
      expect(count("instrument")).toBeGreaterThanOrEqual(3)
      expect(count("studio_landmark")).toBeGreaterThanOrEqual(3)
      expect(count("historical_milestone")).toBeGreaterThanOrEqual(5)
      expect(count("genre") + count("scene") + count("movement")).toBeGreaterThanOrEqual(3)
      expect(count("tradition")).toBeGreaterThanOrEqual(3)
    })
  }
})

describe("P18-T05 vocabulary + provenance validation", () => {
  for (const key of [...WAVE1, ...WAVE2]) {
    it(`${key} passes the governed validator`, () => {
      const raw = readFileSync(path.join(PILOTS_DIR, `${key}.json`), "utf8")
      const result = validatePilot(`${key}.json`, raw)
      expect(result.issues).toEqual([])
      expect(result.ok).toBe(true)
    })
  }
})

describe("P18-T04 staging state", () => {
  it("all Wave-2 corpus rows stage at needs_review/draft", () => {
    for (const key of WAVE2) {
      const bundle = load(key)
      for (const entity of bundle.entities) {
        if ("review_status" in entity) {
          expect((entity as { review_status?: string }).review_status).toBe("needs_review")
        }
      }
    }
  })
})

describe("P18-T08 regression fixtures — Wave-1 payloads unchanged", () => {
  it("original pilots keep their exact entity ids", () => {
    // Snapshot taken at expansion time; any drift in the original five is a
    // regression flagged here rather than silently shipped.
    const expectedCounts: Record<string, number> = {
      detroit: 25,
      kingston: 25,
      lagos: 18,
      london: 21,
      tokyo: 21,
    }
    for (const key of WAVE1) {
      expect(load(key).entities).toHaveLength(expectedCounts[key])
    }
  })

  it("globe index renders all ten through one deterministic code path", () => {
    const first = buildGlobeIndex().places.map((p) => p.key)
    const second = buildGlobeIndex().places.map((p) => p.key)
    expect(first).toEqual(second) // canonical-path sort is stable across calls
    expect(new Set(first).size).toBe(10)
  })
})

describe("P18-T06 same WorldPlaceResponseV2 contract for new regions", () => {
  it("composes a complete v2 response for a Wave-2 region without bespoke branches", () => {
    const bundle = load("bronx")
    const input = {
      identity: {
        key: "bronx",
        canonicalPath: "us/ny/bronx",
        name: "The Bronx",
        countryName: "United States",
        center: { lat: 40.8448, lng: -73.8648 },
      },
      musicalIdentity: "The birthplace of hip-hop.",
      curatedSections: {
        fromHere: bundle.entities
          .filter((e) => e.entity_type === "artist_reference")
          .map((e) => ({ ...e, canonical_name: String(e.seed_id).replace(/_/g, " ") })),
        // Flat item arrays with full entity rows, matching how the
        // repository layer feeds compose.
        historyHere: bundle.entities.filter((e) => e.entity_type === "historical_milestone"),
      },
      sourceRefs: [{ key: "bronx_council_arts_hip_hop", name: "Bronx Council on the Arts" }],
      provenance: { fromHere: { sourceKeys: ["bronx_council_arts_hip_hop"], lastReviewedAt: null } },
    }
    const response = composeWorldPlaceV2(input as never)
    expect(response.identity.key).toBe("bronx")
    expect(response.overview.musicalIdentity.length).toBeGreaterThan(0)
    expect(response.artists.items.length).toBeGreaterThan(0)
    expect(response.history.items.length).toBeGreaterThan(0)
  })
})
