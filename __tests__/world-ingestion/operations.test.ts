/**
 * P15 — ingestion operations tests: kill switches, scheduling policy,
 * bounded retries/dead letters, durable cursors, candidate dedupe.
 */
import { describe, expect, it } from "vitest"

import {
  advanceCursor,
  aliasesCollide,
  backoffForAttempt,
  decideSchedule,
  foldDeadLetter,
  initialCursorState,
  isDead,
  normalizedAliases,
  providerEnabled,
  providerEnvFlagName,
  RETRY_POLICY,
  stableProviderRecordId,
  SCHEDULE_POLICY,
  summarizeDeadLetters,
} from "@/lib/world/ingestion/operations"

const board = (values: Record<string, string>) => ({ get: (name: string) => values[name] })

describe("P15-T07 kill switches / flags", () => {
  it("fail closed — providers are off unless explicitly enabled", () => {
    expect(providerEnabled("musicbrainz", board({}))).toBe(false)
    expect(providerEnabled("musicbrainz", board({ WORLD_INGEST_MUSICBRAINZ_ENABLED: "true" }))).toBe(true)
    expect(providerEnabled("musicbrainz", board({ WORLD_INGEST_MUSICBRAINZ_ENABLED: "1" }))).toBe(false)
  })

  it("the global kill switch wins over per-provider flags", () => {
    const env = { WORLD_INGEST_KILLED: "true", WORLD_INGEST_MUSICBRAINZ_ENABLED: "true" }
    expect(providerEnabled("musicbrainz", board(env))).toBe(false)
  })

  it("derives flag names from provider keys safely", () => {
    expect(providerEnvFlagName("radio-browser")).toBe("WORLD_INGEST_RADIO_BROWSER_ENABLED")
  })
})

describe("P15-T03 scheduling policy", () => {
  it("keeps health refresh separate from identity refresh", () => {
    const rb = SCHEDULE_POLICY["radio-browser"]
    expect(rb.health_refresh.minIntervalMs).toBeLessThan(rb.identity_refresh.minIntervalMs)
    expect(rb.identity_refresh.jobKind).toBe("identity_refresh")
  })

  it("never schedules faster than the source-safe cadence", () => {
    const decision = decideSchedule("musicbrainz", "identity_refresh", {
      nowMs: 10 * 3600_000,
      lastRunAtMs: 0,
      board: board({ WORLD_INGEST_MUSICBRAINZ_ENABLED: "true" }),
    })
    expect(decision.due).toBe(false)
    if (!decision.due) expect(decision.reason).toBe("before_min_interval")
  })

  it("becomes due once the interval has elapsed", () => {
    const day = SCHEDULE_POLICY.musicbrainz.identity_refresh.minIntervalMs
    const decision = decideSchedule("musicbrainz", "identity_refresh", {
      nowMs: day + 1,
      lastRunAtMs: 0,
      board: board({ WORLD_INGEST_MUSICBRAINZ_ENABLED: "true" }),
    })
    expect(decision.due).toBe(true)
  })

  it("disabled or killed providers never run", () => {
    const disabled = decideSchedule("radio-browser", "health_refresh", { nowMs: 1, lastRunAtMs: null, board: board({}) })
    expect(disabled.due === false && disabled.reason === "disabled").toBe(true)
    const killed = decideSchedule("radio-browser", "health_refresh", {
      nowMs: 1,
      lastRunAtMs: null,
      board: board({ WORLD_INGEST_RADIO_BROWSER_ENABLED: "true", WORLD_INGEST_KILLED: "true" }),
    })
    expect(killed.due === false && killed.reason === "killed").toBe(true)
  })
})

describe("P15-T04 bounded retries and dead letters", () => {
  it("backs off exponentially with a hard ceiling", () => {
    expect(backoffForAttempt(1)).toBe(1200)
    expect(backoffForAttempt(2)).toBe(2400)
    expect(backoffForAttempt(3)).toBe(4800)
    expect(backoffForAttempt(99)).toBe(RETRY_POLICY.maxBackoffMs)
  })

  it("folds failures into dead letters until attempts are exhausted", () => {
    let letter = foldDeadLetter(null, "rec-1", "timeout", { id: "rec-1" }, "2026-08-22T00:00:00Z")
    expect(isDead(letter)).toBe(false)
    letter = foldDeadLetter(letter, "rec-1", "timeout", { id: "rec-1" }, "2026-08-22T00:01:00Z")
    letter = foldDeadLetter(letter, "rec-1", "dns failure", { id: "rec-1" }, "2026-08-22T00:02:00Z")
    expect(letter.attempts).toBe(RETRY_POLICY.maxAttempts)
    expect(isDead(letter)).toBe(true)
    expect(letter.reason).toBe("dns failure")
    expect(letter.lastFailedAt > letter.firstFailedAt).toBe(true)
  })

  it("summarizes dead letters by reason deterministically", () => {
    const a = foldDeadLetter(null, "r1", "timeout", 1, "t")
    const b = foldDeadLetter(null, "r2", "timeout", 2, "t")
    const c = foldDeadLetter(null, "r3", "http_404", 3, "t")
    expect(summarizeDeadLetters([a, b, c])).toEqual([
      { reason: "timeout", count: 2 },
      { reason: "http_404", count: 1 },
    ])
  })
})

describe("P15-T02 cursors and watermarks", () => {
  it("advances monotonically and stays idempotent for identical runs", () => {
    let state = initialCursorState("musicbrainz", "identity_refresh")
    state = advanceCursor(state, { cursor: "page-3", ranAtMs: 1000 })
    state = advanceCursor(state, { cursor: "page-7", ranAtMs: 2000 })
    // A late duplicate run must not roll the watermark backwards.
    state = advanceCursor(state, { cursor: "page-7", ranAtMs: 2000 })
    expect(state.lastRunAtMs).toBe(2000)
    expect(state.cursor).toBe("page-7")
    state = advanceCursor(state, { cursor: "page-5", ranAtMs: 1500 })
    expect(state.lastRunAtMs).toBe(2000)
  })
})

describe("P15-T06 candidate duplication detection", () => {
  it("builds stable provider record ids", () => {
    expect(stableProviderRecordId("radio-browser", "radio_station", "12345")).toBe(
      "radio-browser|radio_station|12345",
    )
    expect(() => stableProviderRecordId("radio-browser", "radio_station", "  ")).toThrow()
  })

  it("normalizes diacritics, suffixes, and punctuation into alias sets", () => {
    expect(normalizedAliases("Radio Café FM")).toEqual(["cafe", "radio cafe fm"])
    expect(aliasesCollide("Radio Café FM", "café radio")).toBe(true)
    expect(aliasesCollide("Jazz 91.9", "Classical 88.1")).toBe(false)
  })
})
