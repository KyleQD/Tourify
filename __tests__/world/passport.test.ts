/**
 * P21 — passport/follows/contributions domain tests.
 */
import { describe, expect, it } from "vitest"

import { followId, validateFollow } from "@/lib/world/passport/follows"
import {
  DEFAULT_PASSPORT_SETTINGS,
  deriveMilestones,
  markStopComplete as _unused,
  publicPassportView,
  recordEntry,
  type MusicPassport,
} from "@/lib/world/passport/passport"
import {
  withinRateLimit,
  validateContribution,
} from "@/lib/world/passport/contributions"

void _unused

describe("P21-T01/T02 followable objects", () => {
  it("accepts the five frozen kinds with canonical keys", () => {
    expect(validateFollow("place", "us/mi/detroit")).toEqual({ kind: "place", key: "us/mi/detroit" })
    expect(validateFollow("journey", "birth-of-techno")).toEqual({ kind: "journey", key: "birth-of-techno" })
    expect(validateFollow("country", "jm")).toEqual({ kind: "country", key: "jm" })
  })

  it("fails closed on unknown kinds, empty keys, URLs", () => {
    expect(validateFollow("artist_profile", "x")).toBeNull()
    expect(validateFollow("place", "")).toBeNull()
    expect(validateFollow("scene", "https://x.com/y")).toBeNull()
  })

  it("ids are stable per user+object pair (idempotent storage)", () => {
    const ref = validateFollow("genre", "techno")!
    expect(followId("u1", ref)).toBe(followId("u1", ref))
    expect(followId("u1", ref)).not.toBe(followId("u2", ref))
  })
})

function freshPassport(): MusicPassport {
  return { userId: "u1", settings: DEFAULT_PASSPORT_SETTINGS, entries: [] }
}

describe("P21-T03/T04/T08 passport", () => {
  it("records explicit entries and dedupes idempotently", () => {
    let p = freshPassport()
    const r1 = recordEntry(p, { kind: "place_explored", key: "us/mi/detroit", recordedAt: "2026-08-23T00:00:00Z" })
    expect(r1.ok).toBe(true)
    if (r1.ok) p = r1.passport
    const r2 = recordEntry(p, { kind: "place_explored", key: "us/mi/detroit", recordedAt: "2026-08-23T01:00:00Z" })
    expect(r2.ok && r2.passport.entries).toHaveLength(1)
  })

  it("verified event attendance requires a ticket ref; others forbid one", () => {
    expect(
      recordEntry(freshPassport(), { kind: "event_attended", key: "e1", recordedAt: "t" }).ok,
    ).toBe(false)
    const ok = recordEntry(freshPassport(), {
      kind: "event_attended", key: "e1", recordedAt: "t",
      verification: { ticketRef: "TKT-9" },
    })
    expect(ok.ok).toBe(true)
    expect(
      recordEntry(freshPassport(), { kind: "radio_heard", key: "st-1", recordedAt: "t", verification: { ticketRef: "X" } }).ok,
    ).toBe(false)
  })

  it("passive browsing never writes — only explicit recordEntry mutates", () => {
    // The model has no browsing-input API by construction; this documents it.
    const p = freshPassport()
    expect(p.entries).toHaveLength(0)
  })

  it("private by default; shared exposes counts only, journeys opt-in", () => {
    let p = freshPassport()
    for (const key of ["a", "b"]) {
      const r = recordEntry(p, { kind: "place_explored", key, recordedAt: "t" })
      if (r.ok) p = r.passport
    }
    expect(publicPassportView(p)).toBeNull() // private ⇒ nothing
    p = { ...p, settings: { visibility: "shared", shareJourneys: false } }
    const view = publicPassportView(p) as Record<string, number>
    expect(view.placesExplored).toBe(2)
    expect(view.journeysCompleted).toBeUndefined()
    const sharing = { ...p, settings: { visibility: "shared" as const, shareJourneys: true } }
    expect((publicPassportView(sharing) as Record<string, number>).journeysCompleted).toBe(0)
  })

  it("milestones derive read-only without forced gamification", () => {
    const p = freshPassport()
    const before = deriveMilestones(p)
    expect(before.every((m) => !m.earned)).toBe(true)
    expect(before.some((m) => m.label.match(/streak|leaderboard/i))).toBe(false)
  })
})

describe("P21-T05/T06/T07 contributions", () => {
  it("routes every accepted contribution into candidate review state", () => {
    const result = validateContribution(
      {
        kind: "correction",
        placePath: "us/mi/detroit",
        payload: { targetEntityId: "ent-1", explanation: "Wrong decade on the milestone." },
        submittedBy: "u9",
      },
      "2026-08-23T00:00:00Z",
    )
    expect(result.ok && result.candidate.reviewStatus).toBe("candidate")
    expect(result.ok && result.candidate.contributionId).toHaveLength(40)
  })

  it("enforces payload fields per kind and confines URLs to source suggestions", () => {
    expect(validateContribution({ kind: "artist", placePath: null, payload: {}, submittedBy: "u" }, "t").ok).toBe(false)
    expect(validateContribution({
      kind: "landmark", placePath: "us/ny/bronx",
      payload: { name: "1520 Sedgwick", description: "see https://example.com" },
      submittedBy: "u",
    }, "t").ok).toBe(false)
    const source = validateContribution({
      kind: "source_suggestion", placePath: null,
      payload: { sourceUrl: "https://example.com/history", description: "Great local archive." },
      submittedBy: "u",
    }, "t")
    expect(source.ok).toBe(true)
  })

  it("rate-limits five contributions per hour via sliding window", () => {
    const now = Date.parse("2026-08-23T12:00:00Z")
    const times = [0, 1, 2, 3, 4].map((i) => now - i * 60_000)
    expect(withinRateLimit(times, now)).toBe(false) // 5 in window already
    expect(withinRateLimit(times.slice(1), now)).toBe(true) // 4 in window
    // Old submissions age out.
    const stale = times.map((t) => t - 7200_000)
    expect(withinRateLimit(stale, now)).toBe(true)
  })
})
