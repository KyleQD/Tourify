import {
  extractArtistMusicStoragePath,
  isTrackPubliclyPlayable,
  resolveMusicAccess,
} from "../music-access"

function supabaseWithLibraryEntry(hasEntry: boolean) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: hasEntry ? { id: "library-1" } : null }),
          }),
        }),
      }),
    }),
  }
}

const publicTrack = {
  id: "track-1",
  user_id: "artist-1",
  is_public: true,
  is_visible: true,
  moderation_status: "approved",
  rights_confirmed: true,
  file_url: "https://example.supabase.co/storage/v1/object/public/artist-music/artist-1/full.mp3",
}

describe("music access helpers", () => {
  it("requires confirmed and approved public visibility", () => {
    expect(isTrackPubliclyPlayable(publicTrack)).toBe(true)
    expect(isTrackPubliclyPlayable({ ...publicTrack, rights_confirmed: false })).toBe(false)
    expect(isTrackPubliclyPlayable({ ...publicTrack, moderation_status: "flagged" })).toBe(false)
    expect(isTrackPubliclyPlayable({ ...publicTrack, is_visible: false })).toBe(false)
  })

  it("grants owners full access", async () => {
    const access = await resolveMusicAccess({
      supabase: supabaseWithLibraryEntry(false),
      track: { ...publicTrack, access_mode: "paid", preview_mode: "clip" },
      viewerUserId: "artist-1",
    })

    expect(access).toMatchObject({ allowed: true, accessLevel: "full", isOwner: true })
  })

  it("serves preview for clipped tracks until the listener has a library entitlement", async () => {
    const clippedTrack = {
      ...publicTrack,
      access_mode: "free",
      preview_mode: "clip",
      preview_file_url: "https://example.supabase.co/storage/v1/object/public/artist-music/artist-1/preview.mp3",
    }

    await expect(
      resolveMusicAccess({
        supabase: supabaseWithLibraryEntry(false),
        track: clippedTrack,
        viewerUserId: "listener-1",
      })
    ).resolves.toMatchObject({ allowed: true, accessLevel: "preview" })

    await expect(
      resolveMusicAccess({
        supabase: supabaseWithLibraryEntry(true),
        track: clippedTrack,
        viewerUserId: "listener-1",
      })
    ).resolves.toMatchObject({ allowed: true, accessLevel: "full" })
  })

  it("serves preview for clipped tracks with storage paths when preview_file_url is null", async () => {
    const clippedTrack = {
      ...publicTrack,
      access_mode: "paid",
      preview_mode: "clip",
      preview_status: "ready",
      preview_file_url: null,
      preview_storage_bucket: "artist-music",
      preview_storage_path: "artist-1/preview/clip.mp3",
      storage_bucket: "artist-music",
      storage_path: "artist-1/full/track.mp3",
    }

    await expect(
      resolveMusicAccess({
        supabase: supabaseWithLibraryEntry(false),
        track: clippedTrack,
        viewerUserId: "listener-1",
      })
    ).resolves.toMatchObject({ allowed: true, accessLevel: "preview" })
  })

  it("parses artist-music storage paths", () => {
    expect(
      extractArtistMusicStoragePath(
        "https://example.supabase.co/storage/v1/object/public/artist-music/user-1/track.mp3"
      )
    ).toBe("user-1/track.mp3")
  })
})
