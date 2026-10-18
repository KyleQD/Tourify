import { describe, expect, it } from 'vitest'
import { buildFeedDiscovery, type FeedDiscoveryPost } from '@/lib/feed/feed-discovery'

const posts: FeedDiscoveryPost[] = [
  {
    id: 'show-post-a',
    content: 'Doors tonight',
    event_preview: { id: 'show-1', title: 'The First Show', posterUrl: 'https://cdn.example.com/show.jpg', url: '/events/show-1', location: 'Las Vegas' },
    profiles: { username: 'promoter' },
  },
  {
    id: 'show-post-b',
    content: 'Same event repost',
    event_preview: { id: 'show-1', title: 'The First Show', url: '/events/show-1' },
    profiles: { username: 'another-promoter' },
  },
  {
    id: 'track-post',
    content: 'New track',
    track_preview: { id: 'track-1', title: 'Moonlight Drive', coverArtUrl: 'https://cdn.example.com/track.jpg', artistName: 'DJ Blue' },
    profiles: { username: 'djblue' },
  },
  {
    id: 'photo-post',
    content: 'Backstage',
    media_urls: ['https://cdn.example.com/photo.jpg'],
    profiles: { username: 'photographer' },
  },
  {
    id: 'artist-post',
    content: 'Working on something special',
    user_id: 'user-5',
    profiles: { username: 'artistone', full_name: 'Artist One', account_context: { type: 'artist', profile_id: 'artist-5', profile_path: '/artist/artistone' } },
  },
  {
    id: 'artist-post-again',
    content: 'Checking in',
    user_id: 'user-5',
    profiles: { username: 'artistone', account_context: { type: 'artist', profile_id: 'artist-5' } },
  },
]

describe('feed discovery selectors', () => {
  it('selects genuine event, music and photo moments without duplicating events', () => {
    const items = buildFeedDiscovery(posts, 'highlights')
    expect(items.map(item => item.kind)).toEqual(['event', 'music', 'moment', 'artist'])
    expect(items[0].href).toBe('/events/show-1')
    expect(items[1].title).toBe('Moonlight Drive')
  })

  it('only creates an artist spotlight for artist account posts', () => {
    const items = buildFeedDiscovery(posts, 'artists')
    expect(items).toHaveLength(1)
    expect(items[0].href).toBe('/artist/artistone')
    expect(items[0].title).toBe('Artist One')
  })

  it('respects the posts passed by the existing feed query and returns empty without content', () => {
    expect(buildFeedDiscovery([], 'highlights')).toEqual([])
    expect(buildFeedDiscovery(posts.slice(0, 1), 'music')).toEqual([])
    expect(buildFeedDiscovery([{ id: 'text-only', content: 'Hello world' }], 'highlights')).toEqual([])
  })

  it('avoids unsafe URLs in previews', () => {
    const items = buildFeedDiscovery([{
      id: 'unsafe',
      event_preview: { id: 'danger', title: 'Example Show', posterUrl: 'javascript:alert(1)', url: 'javascript:alert(2)' },
    }], 'events')
    expect(items).toHaveLength(1)
    expect(items[0].imageUrl).toBeNull()
    expect(items[0].href).toBe('/posts/unsafe')
  })

  it('does not use misleading "trending" or "near you" rankings', () => {
    const items = buildFeedDiscovery(posts, 'events')
    expect(items).toHaveLength(1)
    expect(items[0].subtitle).toBe('Las Vegas')
  })

  it('honors a small carousel limit', () => {
    expect(buildFeedDiscovery(posts, 'highlights', 2)).toHaveLength(2)
  })
})
