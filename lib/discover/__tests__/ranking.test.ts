import {
  rankNewArtists,
  rankTopSongs,
  scoreSongEngagement,
  selectTopAlbumsByGenre,
} from "@/lib/discover/ranking"
import type {
  DiscoverAlbum,
  DiscoverMusicTrack,
  DiscoverProfile,
} from "@/lib/discover/types"

function makeTrack(
  overrides: Partial<DiscoverMusicTrack> & Pick<DiscoverMusicTrack, "id" | "title">
): DiscoverMusicTrack {
  return {
    artist_name: "Artist",
    file_url: `/api/music/stream?trackId=${overrides.id}`,
    plays: 0,
    likes: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe("discover ranking", () => {
  it("scores songs as likes*2 + plays", () => {
    expect(scoreSongEngagement({ likes: 3, plays: 10 })).toBe(16)
  })

  it("ranks top songs by engagement and prefers recent tracks", () => {
    const now = Date.now()
    const tracks = [
      makeTrack({
        id: "old-hit",
        title: "Old Hit",
        likes: 100,
        plays: 1000,
        created_at: new Date(now - 200 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      makeTrack({
        id: "fresh",
        title: "Fresh",
        likes: 5,
        plays: 20,
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      makeTrack({
        id: "hot",
        title: "Hot",
        likes: 12,
        plays: 40,
        created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]

    const ranked = rankTopSongs(tracks, 2, now)
    expect(ranked.map((track) => track.id)).toEqual(["hot", "fresh"])
  })

  it("selects one top album per top genre", () => {
    const albums: DiscoverAlbum[] = [
      {
        id: "a1",
        title: "Rock A",
        artist_name: "A",
        genre: "Rock",
        likes: 2,
        plays: 10,
      },
      {
        id: "a2",
        title: "Rock B",
        artist_name: "B",
        genre: "Rock",
        likes: 20,
        plays: 100,
      },
      {
        id: "a3",
        title: "Jazz A",
        artist_name: "C",
        genre: "Jazz",
        likes: 8,
        plays: 40,
      },
      {
        id: "a4",
        title: "Pop A",
        artist_name: "D",
        genre: "Pop",
        likes: 1,
        plays: 5,
      },
    ]

    const selected = selectTopAlbumsByGenre(albums, 2)
    expect(selected).toHaveLength(2)
    expect(selected[0]?.genre).toBe("Rock")
    expect(selected[0]?.id).toBe("a2")
    expect(selected[1]?.genre).toBe("Jazz")
  })

  it("ranks new artists by created_at descending", () => {
    const artists: DiscoverProfile[] = [
      {
        id: "1",
        username: "older",
        account_type: "artist",
        display_name: "Older",
        verified: false,
        stats: { followers: 10, following: 1, posts: 0 },
        created_at: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        username: "newer",
        account_type: "artist",
        display_name: "Newer",
        verified: false,
        stats: { followers: 2, following: 1, posts: 0 },
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ]

    const ranked = rankNewArtists(artists, 2)
    expect(ranked[0]?.username).toBe("newer")
  })
})
