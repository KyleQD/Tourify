import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('artist home feed analytics + persona scope', () => {
  it('home feed uses type=home and feed-stats', () => {
    const source = read('components/artist/artist-home-feed.tsx')

    expect(source).toContain("filter === 'home' ? 'home'")
    expect(source).toContain('fetchFeedStats')
    expect(source).toContain('/api/artist/feed-stats')
    expect(source).toContain('feedStats.postCount')
    expect(source).toContain('/api/feed/collaborations/pending')
  })

  it('feed route redirects to artist home', () => {
    const source = read('app/artist/feed/page.tsx')
    expect(source).toContain("redirect('/artist')")
  })

  it('scopes feed-stats posts to posted_as_profile_id only', () => {
    const source = read('app/api/artist/feed-stats/route.ts')

    expect(source).toContain(".eq('posted_as_profile_id', profileId)")
    expect(source).toContain("computeArtistFeedEngagementRate")
    expect(source).toContain("account_type', 'artist'")
    expect(source).not.toContain('get_enhanced_artist_stats')
  })

  it('threads home/tagged scopes and attribution=strict through the feed posts route', () => {
    const source = read('app/api/feed/posts/route.ts')
    expect(source).toContain("attributionParam === 'strict'")
    expect(source).toContain('attribution,')
    expect(source).toContain("type === 'home'")
    expect(source).toContain('resolveHomeFeedScope')
  })
})
