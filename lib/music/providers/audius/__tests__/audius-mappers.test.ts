/**
 * lib/music/providers/audius/__tests__/audius-mappers.test.ts
 *
 * Unit tests for the Audius → NormalizedTrack mapper.
 * No network calls; uses inline fixture objects.
 */

import { describe, it, expect } from "vitest"
import { mapAudiusTrackToNormalized, buildAudiusMetadataSnapshot } from "../audius-mappers"
import type { AudiusTrack } from "../audius-schemas"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullTrack: AudiusTrack = {
  id: "abc123",
  title: "Test Track",
  user: { id: "user1", name: "Test Artist", handle: "testartist" },
  artwork: { "150x150": "https://cdn/150.jpg", "480x480": "https://cdn/480.jpg", "1000x1000": "https://cdn/1000.jpg" },
  duration: 213,
  genre: "Electronic",
  permalink: "https://audius.co/testartist/test-track",
  is_streamable: true,
  is_delete: false,
  is_unlisted: false,
}

const minimalTrack: AudiusTrack = {
  id: "min1",
  title: "Minimal",
  user: { id: "u1" },
}

const deletedTrack: AudiusTrack = {
  id: "del1",
  title: "Deleted",
  user: { id: "u2", name: "Artist" },
  is_delete: true,
}

const unlistedTrack: AudiusTrack = {
  id: "unl1",
  title: "Unlisted",
  user: { id: "u3", name: "Artist" },
  is_unlisted: true,
}

const nonStreamableTrack: AudiusTrack = {
  id: "ns1",
  title: "Non-streamable",
  user: { id: "u4", name: "Artist" },
  is_streamable: false,
}

// ---------------------------------------------------------------------------
// Mapper tests
// ---------------------------------------------------------------------------

describe("mapAudiusTrackToNormalized", () => {
  it("maps a full track correctly", () => {
    const result = mapAudiusTrackToNormalized(fullTrack, "canonical-uuid")
    expect(result.id).toBe("canonical-uuid")
    expect(result.title).toBe("Test Track")
    expect(result.artistName).toBe("Test Artist")
    expect(result.artistId).toBe("user1")
    expect(result.artworkUrl).toBe("https://cdn/480.jpg") // prefers 480x480
    expect(result.durationMs).toBe(213000)
    expect(result.provider).toBe("audius")
    expect(result.providerTrackId).toBe("abc123")
    expect(result.availability).toBe("available")
  })

  it("falls back to handle when name is missing", () => {
    const t: AudiusTrack = { ...minimalTrack, user: { id: "u1", handle: "handleonly" } }
    const result = mapAudiusTrackToNormalized(t)
    expect(result.artistName).toBe("handleonly")
  })

  it("returns 'Unknown Artist' when user has no name or handle", () => {
    const result = mapAudiusTrackToNormalized(minimalTrack)
    expect(result.artistName).toBe("Unknown Artist")
  })

  it("returns null artworkUrl when artwork is missing", () => {
    const result = mapAudiusTrackToNormalized(minimalTrack)
    expect(result.artworkUrl).toBeNull()
  })

  it("returns null durationMs when duration is missing", () => {
    const result = mapAudiusTrackToNormalized(minimalTrack)
    expect(result.durationMs).toBeNull()
  })

  it("marks deleted tracks as unavailable", () => {
    expect(mapAudiusTrackToNormalized(deletedTrack).availability).toBe("unavailable")
  })

  it("marks unlisted tracks as unavailable", () => {
    expect(mapAudiusTrackToNormalized(unlistedTrack).availability).toBe("unavailable")
  })

  it("marks non-streamable tracks as unavailable", () => {
    expect(mapAudiusTrackToNormalized(nonStreamableTrack).availability).toBe("unavailable")
  })

  it("leaves id empty when no canonicalId provided", () => {
    const result = mapAudiusTrackToNormalized(fullTrack)
    expect(result.id).toBe("")
  })

  it("never includes a sourceUrl / stream URL in the normalized track", () => {
    const result = mapAudiusTrackToNormalized(fullTrack, "id")
    // NormalizedTrack has no sourceUrl field — verify the shape
    expect("sourceUrl" in result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Metadata snapshot tests
// ---------------------------------------------------------------------------

describe("buildAudiusMetadataSnapshot", () => {
  it("builds a snapshot with expected keys", () => {
    const snap = buildAudiusMetadataSnapshot(fullTrack)
    expect(snap.title).toBe("Test Track")
    expect(snap.artist_name).toBe("Test Artist")
    expect(snap.duration_ms).toBe(213000)
    expect(snap.genre).toBe("Electronic")
    expect(snap.canonical_url).toBe("https://audius.co/testartist/test-track")
    expect(snap.availability).toBe("available")
  })

  it("does not include stream URLs", () => {
    const snap = buildAudiusMetadataSnapshot(fullTrack)
    const json = JSON.stringify(snap)
    expect(json).not.toContain("/stream")
    expect(json).not.toContain("stream?")
  })
})
