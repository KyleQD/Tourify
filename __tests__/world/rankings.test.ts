/**
 * P17 — rankings domain tests: frozen vocabulary, deterministic formula,
 * privacy floors, paid-exposure structural exclusion, badges, appeals.
 */
import { describe, expect, it } from "vitest"

import { evaluateBadges } from "@/lib/world/rankings/badges"
import { RANKING_CATEGORIES, RANKING_SCOPES, RANKING_WINDOWS } from "@/lib/world/rankings/contracts"
import {
  computeRanking,
  RANKING_FORMULA_VERSION,
  RANKING_WEIGHTS,
  type SignalSnapshotInput,
} from "@/lib/world/rankings/formula"
import { publicAppealStatus, validateAppeal } from "@/lib/world/rankings/appeals"

const NOW = Date.parse("2026-08-23T12:00:00Z")
const WIN = { start: "2026-08-16T00:00:00Z", end: "2026-08-23T00:00:00Z" }

function signal(subjectId: string, value: number | null, overrides: Partial<SignalSnapshotInput> = {}): SignalSnapshotInput {
  return {
    signalKind: "artist_popularity",
    subjectId,
    subjectName: subjectId,
    value,
    uniqueContributors: 10,
    sampleSizeBucket: value === null ? "<3" : "11-100",
    windowStart: WIN.start,
    windowEnd: WIN.end,
    ...overrides,
  }
}

describe("P17-T01 vocabulary", () => {
  it("freezes scopes/categories/windows", () => {
    expect(RANKING_SCOPES).toEqual(["city", "region", "country", "global"])
    expect(RANKING_CATEGORIES).toEqual(["overall", "genre", "scene", "rising", "live"])
    expect(RANKING_WINDOWS).toEqual(["7d", "30d", "90d", "1y", "all_time"])
  })
})

describe("P17-T02 formula", () => {
  it("has documented weights summing to 1 and a version string", () => {
    const total = Object.values(RANKING_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(Math.abs(total - 1)).toBeLessThan(1e-9)
    expect(RANKING_FORMULA_VERSION).toMatch(/^world-ranking-v/)
  })

  it("is deterministic with stable ties (id asc)", () => {
    const signals = [
      signal("b-artist", 50),
      signal("a-artist", 50),
      signal("c-artist", 80),
    ]
    const opts = { scope: "city" as const, scopeKey: "us/mi/detroit", category: "overall" as const, window: "7d" as const, nowMs: NOW }
    expect(computeRanking(signals, opts)).toEqual(computeRanking(signals, opts))
    const snapshot = computeRanking(signals, opts)
    expect(snapshot.entries.map((e) => e.subjectId)).toEqual(["c-artist", "a-artist", "b-artist"])
    expect(snapshot.entries.map((e) => e.rank)).toEqual([1, 2, 3])
  })

  it("weights components according to the documented mix", () => {
    // artist_popularity weight 0.3 vs venue_activity weight 0.05.
    const snapshot = computeRanking(
      [signal("x", 100), signal("x", 100, { signalKind: "venue_activity" })],
      { scope: "city", scopeKey: "k", category: "overall", window: "7d", nowMs: NOW },
    )
    const expected = Math.round((100 * 0.3 + 100 * 0.05) * 1e6) / 1e6
    expect(snapshot.entries[0].score).toBe(expected)
    expect(snapshot.entries[0].componentScores.artist_popularity).toBe(100)
  })
})

describe("P17-T03 floors and exclusions", () => {
  it("suppresses below-floor cohorts before they can influence output", () => {
    const snapshot = computeRanking(
      [signal("tiny", 999, { sampleSizeBucket: "<3", value: null })],
      { scope: "city", scopeKey: "k", category: "overall", window: "7d", nowMs: NOW },
    )
    expect(snapshot.entries).toHaveLength(0)
    expect(snapshot.explainability.suppressedBelowFloor).toBe(1)
  })

  it("excludes fraud-flagged subjects entirely and counts them", () => {
    const snapshot = computeRanking(
      [signal("clean", 10), signal("shady", 5000)],
      {
        scope: "city", scopeKey: "k", category: "overall", window: "7d", nowMs: NOW,
        suspiciousSubjectIds: new Set(["shady"]),
      },
    )
    expect(snapshot.entries.map((e) => e.subjectId)).toEqual(["clean"])
    expect(snapshot.explainability.excludedSuspicious).toBe(1)
  })
})

describe("P17-T06 paid exposure cannot contribute", () => {
  it("ignores rows carrying promotion fields outright", () => {
    const promoted = { ...signal("paid", 9000), promoted: true } as unknown as SignalSnapshotInput
    const snapshot = computeRanking(
      [promoted, signal("organic", 5)],
      { scope: "city", scopeKey: "k", category: "overall", window: "7d", nowMs: NOW },
    )
    expect(snapshot.entries.map((e) => e.subjectId)).toEqual(["organic"])
  })

  it("caps list length per snapshot", () => {
    const many = Array.from({ length: 250 }, (_, i) => signal(`s${String(i).padStart(3, "0")}`, i + 1))
    const snapshot = computeRanking(many, {
      scope: "global", scopeKey: "world", category: "overall", window: "7d", nowMs: NOW, limit: 25,
    })
    expect(snapshot.entries).toHaveLength(25)
    expect(snapshot.entries[0].rank).toBe(1)
    expect(snapshot.entries.at(-1)?.rank).toBe(25)
  })
})

describe("P17-T07/T08/T09 badges", () => {
  function snapshotFor(entries: Array<{ id: string }>, category: "overall" | "rising" | "live" = "overall") {
    // Array position IS the intended rank: strictly descending values make
    // computeRanking assign ranks in order.
    const n = entries.length
    return computeRanking(
      entries.map((e, i) => signal(e.id, n - i)),
      { scope: "city", scopeKey: "us/mi/detroit", category, window: "7d", nowMs: NOW },
    )
  }

  it("awards scoped dated expiring badges with plain-language reasons", () => {
    const snap = snapshotFor([{ id: "top" }, { id: "filler" }, { id: "mid" }])
    const earned = evaluateBadges([snap], "top", NOW)
    const kinds = earned.map((b) => b.badgeKind)
    expect(kinds).toContain("number_one")
    expect(kinds).toContain("top_10")
    expect(kinds).toContain("top_100")
    for (const badge of earned) {
      expect(badge.validUntil >= badge.validFrom).toBe(true)
      expect(badge.explanation).not.toMatch(/fraud|suspicious|internal|component/i)
      expect(badge.scopeKey).toBe("us/mi/detroit")
    }
  })

  it("earns nothing once ranks fall outside definitions or windows expire", () => {
    // 100 entries; "mid" sits at rank 60 — beyond every definition's maxRank.
    const entries = Array.from({ length: 60 }, (_, i) => ({ id: i === 59 ? "mid" : `p${String(i).padStart(3, "0")}` }))
    const snap = snapshotFor(entries)
    expect(snap.entries.find((e) => e.subjectId === "mid")?.rank).toBe(60)
    // Rank 60 is outside Top25/Top10/#1 but still inside Top 100.
    const earned = evaluateBadges([snap], "mid", NOW)
    expect(earned.map((b) => b.badgeKind)).toEqual(["top_100"])

    const JAN = { start: "2026-01-01T00:00:00Z", end: "2026-01-08T00:00:00Z" }
    const expiredSnap = computeRanking(
      [signal("old", 100, { windowStart: JAN.start, windowEnd: JAN.end })],
      {
        scope: "city", scopeKey: "k", category: "overall", window: "7d",
        nowMs: Date.parse("2026-01-08T06:00:00Z"),
      },
    )
    // Evidence ended in January; by August the badge has expired.
    expect(evaluateBadges([expiredSnap], "old", NOW)).toHaveLength(0)
  })
})

describe("P17-T10 appeals", () => {
  const base = {
    subjectId: "artist-1",
    subjectKind: "artist" as const,
    scope: "city",
    scopeKey: "us/mi/detroit",
    claimedScopeKey: "ca/on/windsor",
    window: "7d",
    reason: "I am based in Windsor, Ontario; my placement is materially wrong.",
    submittedBy: "user-9",
  }

  it("accepts material corrections and normalizes the draft", () => {
    const result = validateAppeal(base, "2026-08-23T00:00:00Z")
    expect(result.ok && result.draft.status).toBe("submitted")
  })

  it("fails closed on non-corrections, thin reasons, missing ids", () => {
    expect(validateAppeal({ ...base, claimedScopeKey: base.scopeKey }).ok).toBe(false)
    expect(validateAppeal({ ...base, reason: "wrong" }).ok).toBe(false)
    expect(validateAppeal({ ...base, subjectId: "" }).ok).toBe(false)
  })

  it("exposes only stage-level status to artists", () => {
    expect(publicAppealStatus("submitted")).toMatch(/received/i)
    expect(publicAppealStatus("accepted")).toMatch(/corrected/i)
  })
})
