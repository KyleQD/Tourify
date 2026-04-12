import {
  hasReachedDownloadLimit,
  parseStorageTargetFromUrl,
  resolveStorageTarget,
  shouldRefreshSignedUrl,
} from "../entitlement-delivery"

describe("marketplace entitlement delivery helpers", () => {
  it("parses supabase storage urls into bucket and path", () => {
    const target = parseStorageTargetFromUrl(
      "https://example.supabase.co/storage/v1/object/public/artist-music/user-1/track.mp3"
    )

    expect(target).toEqual({
      bucket: "artist-music",
      path: "user-1/track.mp3",
    })
  })

  it("prefers explicit bucket/path over URL parsing", () => {
    const target = resolveStorageTarget({
      signedUrl: null,
      signedUrlExpiresAt: null,
      maxDownloads: 5,
      downloadCount: 0,
      assetBucket: "artist-music",
      assetPath: "user-1/track.mp3",
      assetUrl: "https://example.supabase.co/storage/v1/object/public/other/file.mp3",
      watermarkedAssetUrl: null,
    })

    expect(target).toEqual({
      bucket: "artist-music",
      path: "user-1/track.mp3",
    })
  })

  it("flags signed url refresh when missing or expired", () => {
    const nowMs = Date.now()
    expect(
      shouldRefreshSignedUrl({
        signedUrl: null,
        signedUrlExpiresAt: null,
        nowMs,
      })
    ).toBe(true)

    expect(
      shouldRefreshSignedUrl({
        signedUrl: "https://signed",
        signedUrlExpiresAt: new Date(nowMs + 60_000).toISOString(),
        nowMs,
      })
    ).toBe(false)
  })

  it("enforces download limits only for positive max", () => {
    expect(hasReachedDownloadLimit({ maxDownloads: 5, downloadCount: 5 })).toBe(true)
    expect(hasReachedDownloadLimit({ maxDownloads: 5, downloadCount: 2 })).toBe(false)
    expect(hasReachedDownloadLimit({ maxDownloads: 0, downloadCount: 999 })).toBe(false)
  })
})
