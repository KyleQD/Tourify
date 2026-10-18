import { canonicalizePublisherUrl, normalizeRssCandidate } from '@/lib/news/ingestion/normalize-rss'

const base = {
  sourceId: 'approved-source-id',
  sourceName: 'Example Music Magazine',
  title: 'New Festival Announced',
  link: 'https://example.org/2026/festival?utm_campaign=email&story=123',
  publishedAt: '2026-10-10T10:00:00Z',
  summary: '<p>More reporting from the event</p>',
  imageUrl: 'https://example.org/news.jpg',
  rightsPolicy: 'link_only' as const,
}

describe('RSS import normalization', () => {
  it('strips tracking parameters and fragments', () => {
    expect(canonicalizePublisherUrl('https://example.org/story?utm_source=x&id=2#top'))
      .toBe('https://example.org/story?id=2')
  })

  it('rejects local/unsafe URL forms without doing any fetch', () => {
    expect(canonicalizePublisherUrl('javascript:alert(1)')).toBeNull()
    expect(canonicalizePublisherUrl('http://example.org')).toBeNull()
    expect(canonicalizePublisherUrl('https://127.0.0.1/private')).toBeNull()
    expect(canonicalizePublisherUrl('https://localhost/private')).toBeNull()
    expect(canonicalizePublisherUrl('https://user:password@example.org/story')).toBeNull()
  })

  it('leaves external link-only imports unpublished, unverified and without media', () => {
    const item = normalizeRssCandidate(base)
    expect(item).toMatchObject({
      origin_type: 'rss',
      publication_state: 'pending',
      moderation_state: 'pending',
      visibility: 'private',
      rights_state: 'link_only',
      excerpt: '',
      image_url: null,
    })
  })

  it('deduplicates the same publisher URL across tracking variants', () => {
    const first = normalizeRssCandidate(base)
    const second = normalizeRssCandidate({
      ...base,
      link: 'https://example.org/2026/festival?story=123&utm_source=social'
    })
    expect(first?.dedupe_key).toBe(second?.dedupe_key)
  })

  it('permits an authorized short excerpt for explicitly licensed sources only', () => {
    const item = normalizeRssCandidate({ ...base, rightsPolicy: 'licensed' })
    expect(item?.excerpt).toContain('More reporting')
    expect(item?.image_url).toBe('https://example.org/news.jpg')
  })

  it('rejects a blank headline', () => {
    expect(normalizeRssCandidate({ ...base, title: ' ' })).toBeNull()
  })
})
