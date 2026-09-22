import { describe, expect, it, vi } from "vitest"

import { radioStreamResolver } from "@/lib/playback/resolvers/radio"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

const uuid = "22222222-2222-4222-8222-222222222222"

function ctx(overrides: Partial<{ flags: Record<string, boolean> }> = {}) {
  const supabase = {
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({ single: () =>
          Promise.resolve({
            data: {
              id: uuid,
              slug: "fixture-fm",
              name: "Fixture FM",
              homepage_url: "https://fixture.example",
              playback_status: "playable",
              review_status: "verified",
              publication_status: "published",
              rights_status: "partner",
              metadata: {},
            },
            error: null,
          }),
          }),
      }),
    })),
  }
  const trustedSupabase = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [
              {
                id: uuid,
                endpoint_kind: "direct_url",
                stream_url: "https://streams.example/live",
                resolver_reference: null,
                health_status: "healthy",
                rights_class: "direct_stream_allowed",
                availability_status: "available",
                territory_rules: {},
              },
            ],
            error: null,
          }),
      }),
    })),
  }
  return {
    supabase,
    trustedSupabase,
    userId: uuid,
    ...overrides,
  }
}

const flagState = { world_music_enabled: true, world_music_radio_enabled: true }

vi.mock("@/lib/playback/flags", () => ({
  resolveWorldPlaybackFlags: vi.fn(async () => ({ ...flagState })),
}))

async function expectUnavailable(promise: Promise<unknown>) {
  await expect(promise).rejects.toThrow(TourifyMusicError)
}

describe("radio resolver (test matrix items 4-7)", () => {
  it("rejects cleanly when the radio flag is disabled (item 4)", async () => {
    flagState.world_music_radio_enabled = false
    try {
      await expectUnavailable(radioStreamResolver.resolve({ kind: "radio_stream", stationId: uuid }, ctx()))
    } finally {
      flagState.world_music_radio_enabled = true
    }
  })

  it("refuses unpublished stations (item 5)", async () => {
    const badCtx = ctx()
    badCtx.supabase.from = () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { publication_status: "draft" }, error: null }) }) }),
    }) as never
    await expectUnavailable(radioStreamResolver.resolve({ kind: "radio_stream", stationId: uuid }, badCtx))
  })

  it("refuses stations without an approved healthy stream (item 6)", async () => {
    const badCtx = ctx()
    badCtx.trustedSupabase.from = () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [
              {
                id: uuid,
                endpoint_kind: "direct_url",
                stream_url: "https://x.example/s",
                health_status: "unavailable",
                rights_class: "unknown",
                availability_status: "unavailable",
                territory_rules: {},
              },
            ],
            error: null,
          }),
      }),
    }) as never
    await expectUnavailable(radioStreamResolver.resolve({ kind: "radio_stream", stationId: uuid }, badCtx))
  })

  it("resolves an approved station with live capabilities and attribution (item 7)", async () => {
    const resolution = await radioStreamResolver.resolve(
      { kind: "radio_stream", stationId: uuid },
      ctx()
    )
    expect(resolution.identity.kind).toBe("radio_stream")
    expect(resolution.capabilities.live).toBe(true)
    expect(resolution.capabilities.seek).toBe(false)
    expect(resolution.identity.attribution).toBeTruthy()
    // Server-only stream row fields are never returned wholesale.
    const serialized = JSON.stringify(resolution)
    expect(serialized).not.toContain("health_status")
    expect(serialized).not.toContain("rights_class")
    expect(serialized).not.toContain("territory_rules")
  })
})
