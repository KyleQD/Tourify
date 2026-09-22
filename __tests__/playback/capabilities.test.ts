import { describe, expect, it } from "vitest"

import { capabilitiesFor } from "@/lib/playback/capabilities"

describe("playback capabilities", () => {
  it("live radio cannot seek, repeat, shuffle, or join the music library", () => {
    const caps = capabilitiesFor("radio_stream")
    expect(caps).toMatchObject({
      seek: false,
      repeat: false,
      shuffle: false,
      musicLibrary: false,
      live: true,
      nowPlaying: "station_metadata",
    })
  })

  it("tracks keep full existing behavior", () => {
    expect(capabilitiesFor("track")).toMatchObject({
      seek: true,
      queue: true,
      repeat: true,
      shuffle: true,
      musicLibrary: true,
      live: false,
    })
  })

  it("sound guides and narration seek/repeat but stay out of the music library", () => {
    for (const kind of ["sound_guide", "narration"] as const) {
      const caps = capabilitiesFor(kind)
      expect(caps.seek).toBe(true)
      expect(caps.repeat).toBe(true)
      expect(caps.musicLibrary).toBe(false)
      expect(caps.live).toBe(false)
    }
  })

  it("archive audio is conservative until per-asset capability data exists", () => {
    expect(capabilitiesFor("archive_audio").seek).toBe(false)
  })
})
