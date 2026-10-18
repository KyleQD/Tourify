import { describe, expect, it } from "vitest"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import { pickDailyTrack, uniquePlayableTracks } from "@/lib/jukebox/home-discovery"

function track(id: string, overrides: Partial<JukeboxTrack> = {}): JukeboxTrack {
  return {
    id,
    title: "Song " + id,
    artist_name: "Artist",
    file_url: "/api/music/stream?trackId=" + id,
    ...overrides,
  }
}

describe("Jukebox homepage discovery", () => {
  it("provides a reproducible daily pick regardless of input ordering", () => {
    const tracks = [track("alpha"), track("beta"), track("gamma")]
    const first = pickDailyTrack(tracks, "2026-10-18")
    expect(first).toBeTruthy()
    expect(pickDailyTrack([...tracks].reverse(), "2026-10-18")?.id).toBe(first?.id)
    expect(pickDailyTrack(tracks, "2026-10-18")?.id).toBe(first?.id)
  })

  it("handles an empty discovery pool without inventing a song", () => {
    expect(pickDailyTrack([], "2026-10-18")).toBeNull()
  })

  it("deduplicates and excludes paid or incomplete tracks", () => {
    const playable = track("a")
    const items = [
      playable,
      playable,
      track("b", { access_mode: "paid" }),
      track("c", { title: "" }),
      track("d"),
    ]
    expect(uniquePlayableTracks(items).map((item) => item.id)).toEqual(["a", "d"])
  })
})
