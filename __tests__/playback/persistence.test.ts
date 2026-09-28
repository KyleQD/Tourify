import { describe, expect, it } from "vitest"

import { parseResolveRequest } from "@/lib/playback/normalize"
import { sanitizeMediaForPersistence, jukeboxTrackToIdentity } from "@/lib/playback/adapters/jukebox-track"

const uuid = "11111111-1111-4111-8111-111111111111"

describe("resolve request parsing", () => {
  it("treats a legacy trackId body as a track request (item 1)", () => {
    const parsed = parseResolveRequest({ trackId: uuid })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.request.kind).toBe("track")
  })

  it("validates each kind against exactly its own identifier", () => {
    const okRadio = parseResolveRequest({ kind: "radio_stream", stationId: uuid })
    expect(okRadio.ok).toBe(true)

    const mixed = parseResolveRequest({ kind: "radio_stream", trackId: uuid })
    expect(mixed.ok).toBe(false)

    const wrongAsset = parseResolveRequest({ kind: "sound_guide", stationId: uuid })
    expect(wrongAsset.ok).toBe(false)

    const badUuid = parseResolveRequest({ kind: "radio_stream", stationId: "not-a-uuid" })
    expect(badUuid.ok).toBe(false)
  })
})

describe("jukebox persistence hardening (item 9)", () => {
  it("maps jukebox tracks to identity without transient URLs", () => {
    const identity = jukeboxTrackToIdentity({
      id: uuid,
      title: "Song",
      artist_name: "Artist",
      cover_art_url: "https://example/img.png",
      provider: "audius",
      file_url: "https://transient.example/stream",
    })
    expect(identity.kind).toBe("track")
    expect(identity.canonicalTrackId).toBe(uuid)
    expect(JSON.stringify(identity)).not.toContain("transient.example")
  })

  it("strips signed/resolved URLs and tokens from persisted state", () => {
    const sanitized = sanitizeMediaForPersistence({
      title: "Station",
      sourceUrl: "https://signed.example/live.m3u8?token=secret",
      stream_url: "https://internal.example/stream",
      expiresAt: "2026-01-01T00:00:00Z",
      accessToken: "supersecret",
      volume: 0.7,
    })
    expect(sanitized).toEqual({ title: "Station", volume: 0.7 })
  })
})
