import { describe, expect, it, vi } from "vitest"

import { trackResolver } from "@/lib/playback/resolvers/track"

const trackId = "55555555-5555-4555-8555-555555555555"

vi.mock("@/lib/music/providers/audius/audius-config", () => ({
  isAudiusEnabled: vi.fn(() => true),
}))

vi.mock("@/lib/music/providers/audius/audius-adapter", () => ({
  audiusAdapter: {
    resolvePlayback: vi.fn(async () => ({
      track: {} as never,
      sourceType: "direct_url",
      sourceUrl: "https://audius.example/stream",
      expiresAt: "2026-12-31T00:00:00Z",
    })),
  },
}))

function ctxForTrack(metadata: Record<string, unknown>, ref?: { external_track_id: string }) {
  const chainable = (terminal: () => Promise<{ data: unknown; error: null }>) => {
    const builder: Record<string, unknown> = {}
    const proxy = () => builder
    builder.select = () => proxy()
    builder.eq = () => proxy()
    builder.maybeSingle = terminal
    builder.single = terminal
    return builder
  }
  const from = vi.fn((table: string) => {
    if (table === "artist_music") {
      return chainable(() => Promise.resolve({ data: { id: trackId, metadata }, error: null })) as never
    }
    return chainable(() => Promise.resolve({ data: ref ?? null, error: null })) as never
  })
  return { supabase: { from }, trustedSupabase: {}, userId: "user" }
}

describe("track resolver (test matrix items 1-3)", () => {
  it("resolves native tracks through the stream endpoint exactly as before", async () => {
    const resolution = await trackResolver.resolve({ kind: "track", trackId }, ctxForTrack({}) as never)
    expect(resolution.sourceType).toBe("provider_proxy")
    expect(resolution.sourceUrl).toBe(`/api/music/stream?trackId=${trackId}`)
    expect(resolution.capabilities.live).toBe(false)
  })

  it("delegates audius tracks to the existing adapter", async () => {
    const resolution = await trackResolver.resolve(
      { kind: "track", trackId },
      ctxForTrack({ provider: "audius" }, { external_track_id: "ext-1" }) as never
    )
    expect(resolution.sourceType).toBe("direct_url")
    expect(resolution.identity.provider).toBe("audius")
    // Transient URL present in resolution (never persisted elsewhere).
    expect(resolution.sourceUrl).toContain("audius.example")
  })

  it("fails closed when no audius reference exists", async () => {
    await expect(
      trackResolver.resolve({ kind: "track", trackId }, ctxForTrack({ provider: "audius" }) as never)
    ).rejects.toThrow()
  })
})
