import { computeArtistFeedEngagementRate } from '@/lib/artist/feed-stats'

describe('computeArtistFeedEngagementRate', () => {
  it('returns 0 when followers are 0 even if engagement exists', () => {
    expect(computeArtistFeedEngagementRate({
      engagementTotal: 42,
      followers: 0,
    })).toBe(0)
  })

  it('returns engagement as a percentage of followers rounded to 1 decimal', () => {
    expect(computeArtistFeedEngagementRate({
      engagementTotal: 15,
      followers: 100,
    })).toBe(15)

    expect(computeArtistFeedEngagementRate({
      engagementTotal: 1,
      followers: 3,
    })).toBe(33.3)
  })
})
