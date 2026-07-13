import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildFeedMusicTrackFromPost,
  getMusicTrackIdFromPost,
  getStoredTrackPreview,
  isMusicFeedPost,
  normalizeTrackPreview,
} from '@/lib/feed/music-post-preview'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('music-post-preview', () => {
  it('detects music posts from type and metadata track ids', () => {
    expect(isMusicFeedPost({ type: 'music' })).toBe(true)
    expect(isMusicFeedPost({ type: 'audio' })).toBe(true)
    expect(
      isMusicFeedPost({
        type: 'text',
        metadata: { music_track_id: 'track-1' },
      })
    ).toBe(true)
    expect(isMusicFeedPost({ type: 'text', metadata: {} })).toBe(false)
  })

  it('reads track ids from metadata aliases', () => {
    expect(
      getMusicTrackIdFromPost({
        metadata: { music_track_id: 'track-a' },
      })
    ).toBe('track-a')
    expect(
      getMusicTrackIdFromPost({
        metadata: { track_id: 'track-b' },
      })
    ).toBe('track-b')
  })

  it('builds a player track from cover-only media_urls without treating cover as audio', () => {
    const track = buildFeedMusicTrackFromPost({
      id: 'post-1',
      type: 'music',
      content: "New track: 'Palien test'",
      created_at: '2026-07-12T00:00:00.000Z',
      media_urls: ['https://cdn.example.com/cover.jpg'],
      metadata: {
        music_track_id: 'track-99',
        track_title: 'Palien test',
        artist_name: 'Kyle Daley',
        cover_url: 'https://cdn.example.com/cover.jpg',
        stream_url: '/api/music/stream?trackId=track-99',
      },
      profiles: {
        id: 'user-1',
        full_name: 'Kyle Daley',
        username: 'Kyle',
        avatar_url: null,
        is_verified: false,
      },
    })

    expect(track).not.toBeNull()
    expect(track?.id).toBe('track-99')
    expect(track?.title).toBe('Palien test')
    expect(track?.artist).toBe('Kyle Daley')
    expect(track?.cover_art_url).toBe('https://cdn.example.com/cover.jpg')
    expect(track?.file_url).toContain('trackId=track-99')
    expect(track?.file_url).not.toBe('https://cdn.example.com/cover.jpg')
  })

  it('prefers hydrated track_preview over sparse metadata', () => {
    const preview = normalizeTrackPreview({
      id: 'track-hydrated',
      user_id: 'artist-1',
      title: 'Hydrated Title',
      description: 'Full track',
      genre: 'Electronic',
      duration: 214,
      cover_art_url: 'https://cdn.example.com/hydrated.jpg',
      tags: ['live'],
      created_at: '2026-07-12T00:00:00.000Z',
      stats: { plays: 12, likes: 3, comments: 1, shares: 2 },
      access_mode: 'free',
      preview_mode: 'full',
      preview_duration_seconds: 15,
      allow_library_add: true,
      is_public: true,
      is_featured: false,
    }, {
      full_name: 'Hydrated Artist',
      username: 'hydrated',
      avatar_url: 'https://cdn.example.com/avatar.jpg',
    })

    const track = buildFeedMusicTrackFromPost({
      type: 'music',
      content: 'Sharing track',
      metadata: {
        music_track_id: 'track-hydrated',
        track_title: 'Fallback Title',
      },
      track_preview: preview,
    })

    expect(track?.title).toBe('Hydrated Title')
    expect(track?.artist).toBe('Hydrated Artist')
    expect(track?.duration).toBe(214)
    expect(track?.stats.plays).toBe(12)
  })

  it('falls back to stored metadata preview when DB enrichment is missing', () => {
    const preview = getStoredTrackPreview({
      metadata: {
        music_track_id: 'track-fallback',
        track_title: 'Fallback Track',
        artist_name: 'Fallback Artist',
        cover_url: 'https://cdn.example.com/fallback.jpg',
      },
    })

    expect(preview?.id).toBe('track-fallback')
    expect(preview?.title).toBe('Fallback Track')
    expect(preview?.streamUrl).toContain('trackId=track-fallback')
  })
})

describe('feed music post integration', () => {
  it('hydrates track_preview in the feed posts API', () => {
    const source = read('app/api/feed/posts/route.ts')

    expect(source).toContain('fetchTrackPreviews')
    expect(source).toContain('track_preview: trackPreview')
    expect(source).toContain('track_preview: post.track_preview || null')
    expect(source).toContain('isMusicFeedPost')
  })

  it('renders FeedMusicPlayer for music posts instead of cover images', () => {
    const postCard = read('components/feed/post-card.tsx')
    const artistCard = read('components/artist/artist-post-card.tsx')
    const forYou = read('components/feed/for-you-page.tsx')
    const socialFeed = read('components/feed/social-feed.tsx')
    const dashboardFeed = read('components/dashboard/dashboard-feed.tsx')

    expect(postCard).toContain('FeedMusicPlayer')
    expect(postCard).toContain("playSource=\"feed_post\"")
    expect(postCard).toContain('if (musicTrack) return null')
    expect(postCard).not.toContain('Plays in the Tourify jukebox')

    expect(artistCard).toContain('FeedMusicPlayer')
    expect(artistCard).toContain("playSource=\"feed_post\"")
    expect(artistCard).toContain('!musicTrack && mediaItems.length > 0')

    expect(forYou).toContain('isMusicFeedPost')
    expect(forYou).toContain("type: 'music'")
    expect(forYou).toContain('playSource="feed_post"')

    expect(socialFeed).toContain('FeedMusicPlayer')
    expect(socialFeed).toContain('isMusicFeedPost')
    expect(socialFeed).toContain('buildFeedMusicTrackFromPost')
    expect(socialFeed).toContain('playSource="feed_post"')

    expect(dashboardFeed).toContain('FeedMusicPlayer')
    expect(dashboardFeed).toContain('isMusicFeedPost')
    expect(dashboardFeed).toContain('buildFeedMusicTrackFromPost')
    expect(dashboardFeed).toContain('playSource="feed_post"')
    expect(dashboardFeed).toContain('!musicTrack && post.media_urls')
  })

  it('records feed plays with a feed_post analytics source', () => {
    const jukebox = read('contexts/jukebox-context.tsx')
    const player = read('components/feed/feed-music-player.tsx')

    expect(jukebox).toContain('JukeboxPlayOptions')
    expect(jukebox).toContain('body: JSON.stringify({ musicId, source })')
    expect(player).toContain('playSource')
    expect(player).toContain('{ source: playSource }')
    expect(player).toContain("setExpanded(true, 'now-playing')")
  })
})
