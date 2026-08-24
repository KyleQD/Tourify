/**
 * P19 — transmission graph tests: evidence rules, directionality, sensitive
 * claims, place sections, arc clutter policy, tube-map contract, and the
 * seeded priority narratives validating end-to-end.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildPlaceSections,
  selectArcsForRendering,
  validateTransmissionEdge,
  type TransmissionEdge,
} from "@/lib/world/transmission/graph"
import { ARC_CLUTTER_LIMITS, TRANSMISSION_SUBTYPES } from "@/lib/world/transmission/contracts"
import { edgesToTubeMap } from "@/lib/world/transmission/tube-map"

const base: TransmissionEdge = {
  id: "edge-1",
  fromPlaceKey: "kingston",
  toPlaceKey: "london",
  subtype: "scene_influence",
  startYear: 1954,
  era: "Windrush era",
  sourceKeys: ["london_museum_dub", "london_museum_dub_records"],
  confidence: 0.9,
  reviewStatus: "needs_review",
}

describe("P19-T03/T04 edge validation fails closed", () => {
  it("accepts a fully-evidenced directional edge", () => {
    expect(validateTransmissionEdge(base).ok).toBe(true)
  })

  it("requires sources, temporal context, distinct endpoints", () => {
    expect(validateTransmissionEdge({ ...base, sourceKeys: [] }).ok).toBe(false)
    expect(validateTransmissionEdge({ ...base, startYear: null, era: null }).ok).toBe(false)
    expect(validateTransmissionEdge({ ...base, toPlaceKey: "kingston" }).ok).toBe(false)
    expect(validateTransmissionEdge({ ...base, endYear: 1900 }).ok).toBe(false)
  })

  it("directionality is explicit — reversed edges are different claims", () => {
    const forward = validateTransmissionEdge(base)
    const reverse = validateTransmissionEdge({ ...base, id: "edge-1r", fromPlaceKey: "london", toPlaceKey: "kingston" })
    expect(forward.ok && reverse.ok).toBe(true)
    if (forward.ok && reverse.ok) {
      expect(forward.edge.fromPlaceKey).not.toBe(reverse.edge.fromPlaceKey)
    }
  })

  it("sensitive subtypes demand stronger evidence + review assignment", () => {
    const thin = validateTransmissionEdge({
      ...base,
      sourceKeys: ["one-source-only"],
      confidence: 0.6,
      reviewStatus: "candidate",
    })
    expect(thin.ok === false && ["insufficient_sources", "confidence_below_threshold", "sensitive_claims_require_review_assignment"].includes(thin.error)).toBe(true)

    const unassigned = validateTransmissionEdge({ ...base, reviewStatus: "candidate" })
    expect(unassigned.ok === false && unassigned.error).toBe("sensitive_claims_require_review_assignment")

    // Non-sensitive subtypes tolerate lighter evidence.
    const touring = validateTransmissionEdge({
      ...base,
      subtype: "touring_exchange",
      sourceKeys: ["nola_jazz_museum"],
      confidence: 0.6,
      reviewStatus: "candidate",
    })
    expect(touring.ok).toBe(true)
  })

  it("covers exactly the six frozen subtypes", () => {
    expect(TRANSMISSION_SUBTYPES).toEqual([
      "migration_diaspora",
      "touring_exchange",
      "radio_broadcast",
      "technology_transfer",
      "scene_influence",
      "genre_evolution",
    ])
  })
})

describe("P19-T06 place-page sections", () => {
  const edges: TransmissionEdge[] = [
    { ...base, id: "in-1" }, // kingston → london: london is influencedBy
    { ...base, id: "out-1", fromPlaceKey: "london", toPlaceKey: "lagos", subtype: "touring_exchange", reviewStatus: "needs_review" },
    { ...base, id: "rej-1", fromPlaceKey: "havana", toPlaceKey: "london", reviewStatus: "rejected" },
  ]

  it("builds influencedBy / influenced / connected / migration sections without rejected rows", () => {
    const sections = buildPlaceSections("london", edges)
    expect(sections.influencedBy.map((e) => e.from)).toEqual(["kingston"])
    expect(sections.influenced.map((e) => e.to)).toEqual(["lagos"])
    expect(sections.connectedScenes.map((c) => c.other).sort()).toEqual(["kingston", "lagos"].sort())
    const rejectedVisible = JSON.stringify(sections).includes("havana")
    expect(rejectedVisible).toBe(false)
  })

  it("migration stories capture inbound/outbound diaspora with direction", () => {
    const diaspora: TransmissionEdge = {
      ...base,
      id: "mig-1",
      subtype: "migration_diaspora",
      narrative: "Windrush generation brought sound systems.",
    }
    const inbound = buildPlaceSections("london", [diaspora]).migrationStories
    const outbound = buildPlaceSections("kingston", [diaspora]).migrationStories
    expect(inbound[0]).toMatchObject({ with: "kingston", direction: "inbound" })
    expect(outbound[0]).toMatchObject({ with: "london", direction: "outbound" })
  })
})

describe("P19-T07 arc clutter policy", () => {
  const many: TransmissionEdge[] = Array.from({ length: 40 }, (_, i) => ({
    ...base,
    id: `arc-${String(i).padStart(2, "0")}`,
    fromPlaceKey: i % 2 === 0 ? "kingston" : `place-${i}`,
    startYear: 2000 - i,
  }))

  it("caps arcs aggressively and deterministically (newest first, id tiebreak)", () => {
    const arcs = selectArcsForRendering(many, {})
    expect(arcs.length).toBeLessThanOrEqual(ARC_CLUTTER_LIMITS.globalViewMax)
    const again = selectArcsForRendering(many, {})
    expect(arcs.map((a) => a.id)).toEqual(again.map((a) => a.id))
    expect(arcs[0].id).toBe("arc-00") // newest year first
  })

  it("filters by subtype and era; per-place ceiling holds", () => {
    const arcs = selectArcsForRendering(many, { subtypeFilter: new Set(["scene_influence"]), eraFromYear: 1990 })
    for (const arc of arcs) expect(arc.subtype).toBe("scene_influence")
    const fromKingston = arcs.filter((a) => a.fromPlaceKey === "kingston")
    expect(fromKingston.length).toBeLessThanOrEqual(ARC_CLUTTER_LIMITS.perPlaceMax)
  })

  it("provides textual equivalents for accessibility", () => {
    const [first] = selectArcsForRendering(many.slice(0, 1), {})
    expect(first.label).toMatch(/→/)
    expect(first.label).toMatch(/scene_influence/)
  })
})

describe("P19-T08 tube-map contract", () => {
  it("translates edges into deterministic lines/interchanges without geography", () => {
    const edges: TransmissionEdge[] = [
      { ...base, id: "t1" },
      { ...base, id: "t2", subtype: "genre_evolution", fromPlaceKey: "chicago", toPlaceKey: "detroit" },
    ]
    const map = edgesToTubeMap(edges)
    expect(map.lines.map((l) => l.key)).toEqual(["genre_evolution", "scene_influence"]) // sorted
    expect(map.lines[1].stations.map((s) => s.placeKey)).toEqual(["kingston", "london"])
    // kingston+london only on scene_influence line here ⇒ no interchanges.
    expect(map.interchanges).toEqual([])
  })

  it("marks interchanges when places appear on multiple lines", () => {
    const edges: TransmissionEdge[] = [
      { ...base, id: "a" },
      { ...base, id: "b", subtype: "radio_broadcast", sourceKeys: ["london_museum_grime"], confidence: 0.6 },
    ]
    const map = edgesToTubeMap(edges)
    expect(map.interchanges).toEqual(["kingston", "london"])
  })
})

describe("P19-T02 seeded priority narratives validate end-to-end", () => {
  const file = path.join(process.cwd(), "data", "world", "reference", "transmission-narratives.json")
  const bundle = JSON.parse(readFileSync(file, "utf8")) as { edges: TransmissionEdge[] }

  it("contains the eleven priority corridors, each passing validation", () => {
    expect(bundle.edges.length).toBeGreaterThanOrEqual(11)
    for (const edge of bundle.edges) {
      const result = validateTransmissionEdge(edge)
      if (!result.ok) throw new Error(`${edge.id}: ${result.error}`)
    }
  })

  it("every corridor cites at least two registered institutional sources", () => {
    for (const edge of bundle.edges) {
      expect(edge.sourceKeys.length).toBeGreaterThanOrEqual(2)
    }
  })
})
