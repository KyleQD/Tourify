import { describe, expect, it, vi } from "vitest"

import { runProjector } from "@/lib/world/projections/entity-place-facts"
import type { FactStore, ScanRecord } from "@/lib/world/projections/types"

function makeStore() {
  const open = new Map<string, { id: string; fact: any; retired?: boolean }>()
  let seq = 0
  const candidates: any[] = []
  const store: FactStore = {
    async findOpenFact(entityTable, entityId, placeId, relationKey) {
      for (const [id, v] of open) {
        if (!v.retired && v.fact.entityTable === entityTable && v.fact.entityId === entityId && v.fact.placeId === placeId && v.fact.relationKey === relationKey)
          return { id }
      }
      return null
    },
    async insertFact(fact) {
      const id = `f${++seq}`
      open.set(id, { id, fact })
    },
    async updateFact(id, patch) {
      const v = open.get(id)
      if (v) Object.assign(v.fact, patch)
    },
    async retireFact(id) {
      const v = open.get(id)
      if (v) v.retired = true
    },
    async insertReviewCandidate(c) {
      candidates.push(c)
    },
    async findReviewCandidate(entityTable, entityId, reasonPrefix) {
      const hit = candidates.find((c) => c.entityTable === entityTable && c.entityId === entityId && c.reason.startsWith(reasonPrefix))
      return hit ? { id: "c" } : null
    },
    async findStaleFacts() {
      return []
    },
  }
  return { store, open, candidates }
}

const baseRecord: ScanRecord = {
  entityKind: "venue",
  entityTable: "venues_v2",
  entityId: "v-1",
  hints: { city: "Austin", countryCode: "US" },
}

const deps = (resolution: any) => ({
  resolvePlace: vi.fn(async () => resolution),
  relationFor: () => ({ domain: "event_place", key: "occurs_in" }),
})

describe("P3 entity→place projector", () => {
  it("is idempotent: replaying the same scan does not duplicate facts", async () => {
    const { store, open } = makeStore()
    await runProjector([baseRecord], { ...deps({ status: "resolved", placeId: "p1", confidence: 0.9 }), store })
    await runProjector([baseRecord], { ...deps({ status: "resolved", placeId: "p1", confidence: 0.9 }), store })
    expect(open.size).toBe(1)
  })

  it("ambiguous resolution stages a review candidate instead of guessing", async () => {
    const { store, candidates } = makeStore()
    const report = await runProjector([baseRecord], {
      ...deps({ status: "ambiguous", placeIds: ["pa", "pb"] }),
      store,
    })
    expect(report.resolved).toBe(0)
    expect(candidates.length).toBe(1)
    expect(candidates[0].reason).toBe("ambiguous")
  })

  it("unresolved records fail closed without facts or guesses", async () => {
    const { store, open } = makeStore()
    const report = await runProjector([baseRecord], { ...deps({ status: "unresolved" }), store })
    expect(open.size).toBe(0)
    expect(report.unresolved).toBe(1)
  })

  it("one failed record does not abort the run (spec §11)", async () => {
    const { store, open } = makeStore()
    const failingDeps = deps({ status: "resolved", placeId: "p1", confidence: 0.9 })
    failingDeps.resolvePlace.mockRejectedValueOnce(new Error("boom"))
    const report = await runProjector(
      [{ ...baseRecord, entityId: "bad" }, { ...baseRecord, entityId: "good" }],
      { ...failingDeps, store },
    )
    expect(report.errors).toBe(1)
    expect(report.scanned).toBe(2)
  })
})
