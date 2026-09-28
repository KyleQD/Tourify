/**
 * Pure-helper tests for the pilot ingestion adapters (no network).
 * Representative payloads mirror live MusicBrainz / Radio Browser shapes
 * captured during the Detroit staging runs.
 */
import { describe, expect, it } from "vitest"

import { normalizeArtist } from "@/scripts/world/ingestion/musicbrainz"
import { normalizeStation } from "@/scripts/world/ingestion/radio-browser"
import { sha256json, slugify } from "@/scripts/world/ingestion/shared"

describe("ingestion adapter helpers", () => {
  it("normalizes a MusicBrainz artist into stable staged shape", () => {
    const normalized = normalizeArtist({
      id: "d5b3dece-8c6e-4d0b-9c1e-2f2f9a1a4f10",
      name: "Juan Atkins",
      "sort-name": "Atkins, Juan",
      disambiguation: "techno musician",
      country: "US",
      area: { name: "Detroit" },
      "life-span": { begin: "1962-09-15" },
      tags: [
        { name: "techno", count: 42 },
        { name: "electro", count: 17 },
        { name: "det techno", count: 9 },
      ],
    })
    expect(normalized.mbid).toBe("d5b3dece-8c6e-4d0b-9c1e-2f2f9a1a4f10")
    expect(normalized.topTags).toEqual(["techno", "electro", "det techno"])
    expect(normalized.area).toBe("Detroit")
    // hash is stable across key order
    expect(sha256json(normalized)).toBe(sha256json({ ...normalized }))
  })

  it("keeps stream URLs out of Radio Browser normalized payloads", () => {
    const normalized = normalizeStation({
      stationuuid: "1f4a0c21-5a34-4a55-9d0c-abcdefabcdef",
      name: "  Fixture FM  ",
      countrycode: "US",
      state: "Michigan",
      languagecodes: "en",
      tags: "jazz,detroit, news",
      homepage: "https://fixture.example",
      url_resolved: "https://stream.example/live.mp3?token=SECRET",
      codec: "MP3",
      bitrate: 128,
      lastcheckok: 1,
    })
    expect(normalized.name).toBe("Fixture FM")
    expect(normalized.streamHost).toBe("stream.example")
    expect(normalized.streamUrlHash).toMatch(/^[0-9a-f]{64}$/)
    const serialized = JSON.stringify(normalized)
    expect(serialized).not.toContain("stream.example/live")
    expect(serialized).not.toContain("SECRET")
    expect(serialized).not.toContain("url_resolved")
  })

  it("slugifies station names for unique draft slugs", () => {
    expect(slugify("Café del Mar Radio!")).toBe("cafe-del-mar-radio")
    expect(slugify("---")).toBe("")
  })
})
