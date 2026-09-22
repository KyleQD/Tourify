import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("public music track page contract", () => {
  it("exposes the canonical track route and public visibility gate", () => {
    const page = read("app/music/[trackId]/page.tsx")
    const service = read("lib/music/public-track.ts")

    expect(page).toContain("getPublicTrackPageData(trackId)")
    expect(page).toContain("notFound()")
    expect(service).toContain('.eq("is_public", true)')
    expect(service).toContain('.eq("is_visible", true)')
    expect(service).toContain('.eq("moderation_status", "approved")')
    expect(service).toContain('.eq("rights_confirmed", true)')
  })

  it("resolves artist identity from artist_profiles and exposes related events/listings", () => {
    const service = read("lib/music/public-track.ts")
    const detail = read("components/music/music-track-detail.tsx")

    expect(service).toContain('from("artist_profiles")')
    expect(service).toContain("artist_name, url_slug")
    expect(service).toContain("from(\"events\")")
    expect(service).toContain("isArtistEventDiscoverable")
    expect(service).toContain('from("marketplace_listings")')
    expect(service).toContain('.neq("id", track.id)')
    expect(detail).toContain("artist.name")
    expect(detail).toContain("/marketplace/listings/${listing.id}")
    expect(detail).toContain("/api/music/download?trackId=")
  })

  it("keeps comments and sharing tied to the canonical track id", () => {
    const detail = read("components/music/music-track-detail.tsx")
    const comments = read("components/music/music-comment.tsx")
    const shareDialog = read("components/music/music-share-dialog.tsx")

    expect(detail).toContain('<MusicComment musicId={track.id} />')
    expect(detail).toContain("musicId: track.id")
    expect(comments).toContain("eq('music_id', musicId)")
    expect(shareDialog).toContain("/api/music/share-message")
  })

  it("preserves card navigation/play separation and visible sharing", () => {
    const discoverCard = read("components/discover/discover-song-card.tsx")
    const publicMusic = read("components/music/public-music-display.tsx")
    const profileMusic = read("components/profile/profile-music-showcase.tsx")
    const artistMusic = read("app/artist/music/page.tsx")

    for (const source of [discoverCard, publicMusic, profileMusic, artistMusic]) {
      expect(source).toMatch(/getMusicTrackPath\(track\.id\)|\/music\/\$\{track\.id\}/)
      expect(source).toContain("stopPropagation")
    }
    expect(discoverCard).toContain("MusicShareDialog")
    expect(publicMusic).toContain("handleShare(track)")
    expect(profileMusic).toContain("MusicShareDialog")
    expect(artistMusic).toContain("setSharingTrack(track)")
  })

  it("prefers the artist profile name over a general profile name in feed fallback", () => {
    const feed = read("app/api/feed/music/route.ts")
    expect(feed).toContain("artistNameByUserId")
    expect(feed).toContain("artistNameByUserId[String(track.user_id)]")
    expect(feed).toContain("a.artist_name")
  })
})
