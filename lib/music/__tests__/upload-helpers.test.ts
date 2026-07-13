import { readFileSync } from "fs"
import { join } from "path"
import {
  buildMusicSharePostMetadata,
  getAudioDuration,
  hasPlayableAudio,
  parseMusicApiError,
  parsePaidTrackPrice,
  resolveMusicStreamUrl,
} from "../upload-helpers"

describe("music upload helpers", () => {
  it("parses nested and string API errors", () => {
    expect(parseMusicApiError({ error: { message: "Preview not ready", code: "preview_not_ready" } })).toBe(
      "Preview not ready (preview_not_ready)"
    )
    expect(parseMusicApiError({ error: "boom" })).toBe("boom")
    expect(parseMusicApiError({}, "fallback")).toBe("fallback")
  })

  it("requires a positive paid price", () => {
    expect(parsePaidTrackPrice("12.50")).toBe(12.5)
    expect(parsePaidTrackPrice(0)).toBeNull()
    expect(parsePaidTrackPrice("abc")).toBeNull()
    expect(parsePaidTrackPrice(null)).toBeNull()
  })

  it("builds feed-hydratable share metadata", () => {
    expect(
      buildMusicSharePostMetadata({
        trackId: "track-1",
        title: "Song",
        artistName: "Artist",
        genre: "hip-hop",
        type: "single",
        coverUrl: "https://cdn.example/cover.jpg",
      })
    ).toMatchObject({
      music_track_id: "track-1",
      track_id: "track-1",
      track_title: "Song",
    })
  })

  it("resolves stream urls and playable audio flags", () => {
    expect(resolveMusicStreamUrl("abc")).toBe("/api/music/stream?trackId=abc")
    expect(hasPlayableAudio({ storage_path: "user/full.mp3" })).toBe(true)
    expect(hasPlayableAudio({ preview_storage_path: "user/preview.mp3" })).toBe(true)
    expect(hasPlayableAudio({})).toBe(false)
  })

  it("returns zero duration when Audio APIs are unavailable (node/test)", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "broken.mp3", { type: "audio/mpeg" })
    const duration = await getAudioDuration(file, 50)
    expect(duration).toBe(0)
  })

  it("times out audio duration probing when metadata never loads", async () => {
    class FakeAudio {
      preload = ""
      src = ""
      duration = Number.NaN
      addEventListener() {}
      removeEventListener() {}
    }
    const originalAudio = (globalThis as any).Audio
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    ;(globalThis as any).Audio = FakeAudio
    URL.createObjectURL = () => "blob:fake"
    URL.revokeObjectURL = () => {}

    try {
      const file = new File([new Uint8Array([1, 2, 3])], "slow.mp3", { type: "audio/mpeg" })
      const duration = await getAudioDuration(file, 40)
      expect(duration).toBe(0)
    } finally {
      ;(globalThis as any).Audio = originalAudio
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })
})

describe("music route contracts", () => {
  it("play route selects storage preview fields for clip access", () => {
    const source = readFileSync(join(process.cwd(), "app/api/music/play/route.ts"), "utf8")
    expect(source).toContain("preview_storage_path")
    expect(source).toContain("preview_status")
    expect(source).toContain("storage_path")
    expect(source).toContain("storage_bucket")
  })

  it("share route writes music_track_id metadata for feed hydration", () => {
    const source = readFileSync(join(process.cwd(), "app/api/music/share/route.ts"), "utf8")
    expect(source).toContain("music_track_id: track.id")
    expect(source).toContain("createPost")
  })
})
