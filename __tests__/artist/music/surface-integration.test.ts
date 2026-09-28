import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("artist music surface integration contract", () => {
  it("keeps owner catalog reads and writes on the artist music API", () => {
    const page = read("app/artist/music/page.tsx")
    const route = read("app/api/artist/music/route.ts")

    expect(page).toContain("/api/artist/music?limit=300")
    expect(page).toContain("uploadArtistMusicArtifact")
    expect(page).toContain('method: \'POST\'')
    expect(page).toContain('method: \'PATCH\'')
    expect(page).toContain('method: \'DELETE\'')
    expect(route).toContain('.eq("user_id", user.id)')
    expect(route).toContain("artist_profile_id: profile?.id || null")
    expect(route).toContain("select(\"*\")")
  })

  it("preserves opt-in music sharing through the canonical track id", () => {
    const page = read("app/artist/music/page.tsx")
    const shareRoute = read("app/api/music/share/route.ts")

    expect(page).toContain("shareAsPost")
    expect(page).toContain("musicId: trackId")
    expect(page).toContain("createPost: true")
    expect(shareRoute).toContain(".eq('id', musicId)")
    expect(shareRoute).toContain("music_track_id: track.id")
    expect(shareRoute).toContain("type: 'music'")
  })

  it("supports sharing a public track to a post, direct message, or group", () => {
    const page = read("app/artist/music/page.tsx")
    const dialog = read("components/music/music-share-dialog.tsx")
    const route = read("app/api/music/share-message/route.ts")

    expect(page).toContain("MusicShareDialog")
    expect(dialog).toContain("/api/music/share-message")
    expect(dialog).toContain("recipientId: selected.id")
    expect(dialog).toContain("threadId: selected.id")
    expect(route).toContain("Provide exactly one of recipientId or threadId")
    expect(route).toContain('channel: "dm"')
    expect(route).toContain('channel: "group"')
    expect(route).toContain("canonical_track_id: music.id")
    expect(route).toContain("ensureThreadMembership")
  })

  it("keeps public catalog, EPK, profile, and analytics ownership contracts aligned", () => {
    const epkService = read("lib/services/epk.service.ts")
    const publicArtist = read("lib/public-artist/get-public-artist-profile.ts")
    const analytics = read("app/api/artist/music/analytics/route.ts")

    expect(epkService).toContain(".from('artist_music')")
    expect(epkService).toContain(".eq('is_public', true)")
    expect(publicArtist).toContain(".from('artist_music')")
    expect(publicArtist).toContain(".eq('user_id', artistUserId)")
    expect(publicArtist).toContain(".eq('is_public', true)")
    expect(analytics).toContain('.from("artist_music")')
    expect(analytics).toContain('.eq("user_id", user.id)')
    expect(analytics).toContain('.from("music_engagement_events")')
  })

  it("keeps the active schema compatible with artist music trust reads", () => {
    const migration = read("supabase/migrations/20260910140000_artist_music_trust_columns.sql")

    for (const column of [
      "trust_schema_version",
      "trust_setup_status",
      "active_declaration_id",
      "ai_use_category",
      "training_use_policy",
      "origin_status",
      "certification_status",
      "certification_level",
      "certification_public_id",
      "certification_standard_version",
      "certification_updated_at",
    ]) {
      expect(migration).toContain(`add column if not exists ${column}`)
    }
  })

  it("uses the signed cover resolver outside the jukebox player", () => {
    const dashboard = read("app/artist/music/page.tsx")
    const songCard = read("components/discover/discover-song-card.tsx")
    const albumCard = read("components/discover/discover-album-card.tsx")

    for (const source of [dashboard, songCard, albumCard]) {
      expect(source).toContain("TrackCoverImage")
      expect(source).toContain("trackId=")
    }
  })
})
