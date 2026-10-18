import { headlineTerms, suggestRelatedCoverage } from '@/lib/news/clustering/suggest-related'

const incoming = {
  id: 'story-a',
  headline: 'Band Orion announces three European dates for its 2027 tour',
  publishedAt: '2026-10-18T08:00:00Z'
}

describe('editorial story clustering suggestions', () => {
  it('proposes related independent coverage for review', () => {
    const result = suggestRelatedCoverage(incoming, [{
      id: 'story-b',
      headline: 'Band Orion confirms three European dates on its 2027 tour',
      publishedAt: '2026-10-18T09:00:00Z'
    }])
    expect(result).toHaveLength(1)
    expect(result[0].action).toBe('editorial_review')
    expect(result[0].similarity).toBeGreaterThan(0.62)
  })

  it('keeps different album and tour announcements separate', () => {
    const result = suggestRelatedCoverage({
      ...incoming, headline: 'Band Orion announces the 2027 European tour'
    }, [{
      id: 'story-b', headline: 'Band Orion announces the 2027 European album',
      publishedAt: '2026-10-18T09:00:00Z'
    }])
    expect(result).toEqual([])
  })

  it('does not suggest the same article or unrelated older reports', () => {
    const result = suggestRelatedCoverage(incoming, [
      { ...incoming },
      { id: 'old', headline: incoming.headline, publishedAt: '2025-10-18T09:00:00Z' }
    ])
    expect(result).toEqual([])
  })

  it('flags potentially contradictory coverage for more scrutiny', () => {
    const result = suggestRelatedCoverage({
      ...incoming, headline: 'Band Orion cancels three European dates for its 2027 tour'
    }, [{
      id: 'story-b',
      headline: 'Band Orion confirms three European dates for its 2027 tour',
      publishedAt: '2026-10-18T09:00:00Z'
    }])
    expect(result[0]?.potentiallyContradictory).toBe(true)
  })

  it('handles duplicates and linguistic normalization', () => {
    expect(headlineTerms('The CAFÉ café concert!')).toEqual(['cafe', 'concert'])
  })
})
