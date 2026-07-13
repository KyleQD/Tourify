import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('artist feed analytics + persona scope', () => {
  it('loads artist-only posts with strict attribution and owned posts separately', () => {
    const source = read('app/artist/feed/page.tsx')

    expect(source).toContain("attribution: 'strict'")
    expect(source).toContain('fetchArtistPosts')
    expect(source).toContain('fetchOwnedPosts')
    expect(source).toContain('fetchFeedStats')
    expect(source).toContain('/api/artist/feed-stats')
    expect(source).toContain('feedStats.postCount')
    expect(source).toContain('dedupePosts([...artistPosts, ...ownedPosts, ...networkPosts])')
  })

  it('scopes feed-stats posts to posted_as_profile_id only', () => {
    const source = read('app/api/artist/feed-stats/route.ts')

    expect(source).toContain(".eq('posted_as_profile_id', profileId)")
    expect(source).toContain("computeArtistFeedEngagementRate")
    expect(source).toContain("account_type', 'artist'")
    expect(source).not.toContain('get_enhanced_artist_stats')
  })

  it('threads attribution=strict through the feed posts route', () => {
    const source = read('app/api/feed/posts/route.ts')
    expect(source).toContain("attributionParam === 'strict'")
    expect(source).toContain('attribution,')
  })
})
