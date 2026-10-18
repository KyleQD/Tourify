import { describe, expect, it } from "vitest"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import {
  crateTracks, secretCompanionTrack, tracksForCity, tracksForDecade, tracksForMood,
} from "@/lib/jukebox/discovery-extras"

function song(id: string, options: Partial<JukeboxTrack> = {}): JukeboxTrack {
  return {
    id, title: "Track " + id, artist_name: "Artist " + id,
    file_url: "/api/music/stream?trackId=" + id, ...options,
  }
}

describe("Jukebox interactive discovery", () => {
  const tracks = [
    song("a", { genre: "Ambient", tags: ["city:Las Vegas", "release-year:1998"], artist_id: "artistA" }),
    song("b", { genre: "Techno", tags: ["city:Ibiza", "release_year=2003"], artist_id: "artistB" }),
    song("c", { genre: "Ambient", tags: ["decade:1990s"], artist_id: "artistC" }),
    song("d", { genre: "Jazz", artist_id: "artistA" }),
    song("e", { genre: "Indie Rock", tags: ["city:Tokyo", "year:1985"] }),
  ]

  it("filters moods via catalog genres and tags", () => {
    expect(tracksForMood(tracks, "chill").map((t) => t.id)).toEqual(["a", "c", "d"])
    expect(tracksForMood(tracks, "energy").map((t) => t.id)).toEqual(["b", "e"])
    expect(tracksForMood(tracks, "adventure").length).toBe(5)
  })

  it("matches only explicit release-era metadata, not upload date", () => {
    expect(tracksForDecade(tracks, "1990s").map((t) => t.id)).toEqual(["a", "c"])
    expect(tracksForDecade(tracks, "2000s").map((t) => t.id)).toEqual(["b"])
    expect(tracksForDecade(tracks, "1970s")).toEqual([])
  })

  it("requires explicit geographic metadata to avoid fabricated hometowns", () => {
    expect(tracksForCity(tracks, "Las Vegas").map((t) => t.id)).toEqual(["a"])
    expect(tracksForCity(tracks, "Santa Barbara")).toEqual([])
  })

  it("selects a hidden related track without choosing the daily song itself", () => {
    const bside = secretCompanionTrack(tracks, tracks[0])
    expect(bside?.track.id).toBe("d")
    expect(bside?.reason).toContain("artist")
    expect(secretCompanionTrack([tracks[0]], tracks[0])).toBeNull()
  })

  it("produces stable, unique crates and excludes the playing item", () => {
    const one = crateTracks(tracks, 8, "a", 3)
    expect(one.length).toBe(3)
    expect(one.every((t) => t.id !== "a")).toBe(true)
    expect(crateTracks([...tracks].reverse(), 8, "a", 3).map((t) => t.id)).toEqual(one.map((t) => t.id))
  })
})
