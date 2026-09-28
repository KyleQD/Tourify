import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("artist music surface contract", () => {
  it("defines one scoped transport for artist music API requests", () => {
    const source = read("lib/artist/artist-music.ts")

    expect(source).toContain('export const ARTIST_MUSIC_API_PREFIX = "/api/artist/music"')
    expect(source).toContain('credentials: "include"')
    expect(source).toContain('cache: "no-store"')
    expect(source).toContain("isArtistMusicApiPath")
  })

  it("accepts query strings without widening the artist music namespace", async () => {
    const { isArtistMusicApiPath } = await import("@/lib/artist/artist-music")

    expect(isArtistMusicApiPath("/api/artist/music")).toBe(true)
    expect(isArtistMusicApiPath("/api/artist/music?limit=300")).toBe(true)
    expect(isArtistMusicApiPath("/api/artist/music/analytics?range=30d")).toBe(true)
    expect(isArtistMusicApiPath("/api/artist/music/rights/track%2Fid?tab=claims")).toBe(true)
    expect(isArtistMusicApiPath("/api/artist/musical?limit=300")).toBe(false)
    expect(isArtistMusicApiPath("/api/music?limit=300")).toBe(false)
    expect(isArtistMusicApiPath("https://example.com/api/artist/music?limit=300")).toBe(false)
    expect(isArtistMusicApiPath("//example.com/api/artist/music?limit=300")).toBe(false)
  })

  it("defines the server-side artist profile gate for route adoption", () => {
    const source = read("lib/artist/artist-music-auth.ts")

    expect(source).toContain('import "server-only"')
    expect(source).toContain("requireApiUser")
    expect(source).toContain('.from("artist_profiles")')
    expect(source).toContain('code: "artist_profile_required"')
    expect(source).toContain("artistProfile")
  })

  it("keeps the main music dashboard on the artist API and shared upload flow", () => {
    const source = read("app/artist/music/page.tsx")

    expect(source).toContain('from "@/lib/artist/artist-music"')
    expect(source).toContain("artistMusicApiFetch")
    expect(source).toContain("uploadArtistMusicArtifact")
    expect(source).not.toContain("from '@/lib/supabase'")
  })

  it("routes secondary artist music dashboards through the same transport", () => {
    const paths = [
      "app/artist/music/analytics/page.tsx",
      "app/artist/music/certification/[trackId]/page.tsx",
      "app/artist/music/rights/[trackId]/page.tsx",
      "app/artist/music/royalties/page.tsx",
    ]

    for (const path of paths) {
      const source = read(path)
      expect(source, path).toContain("artistMusicApiFetch")
      expect(source, path).toContain('from "@/lib/artist/artist-music"')
    }
  })
})
