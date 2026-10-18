import { isPublicNewsCandidate } from '@/lib/news/publication'
import type { NewsFeedItem } from '@/lib/news/types'

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: 'external_1',
    originType: 'external',
    sourceType: 'publisher',
    sourceName: 'Approved Publisher',
    title: 'A public news headline',
    summary: 'Summary',
    url: 'https://example.org/story',
    publishedAt: '2026-10-18T00:00:00Z',
    topics: ['Music'],
    metrics: { likes: 0, comments: 0, shares: 0, views: 0 },
    moderation: { trustLabel: 'unverified', confidence: 0.5, moderationState: 'approved' },
    relevanceScore: 0,
    score: 0,
    ...overrides,
  }
}

describe('public News candidate eligibility', () => {
  it('allows a reviewed external link', () => {
    expect(isPublicNewsCandidate(makeItem())).toBe(true)
  })

  it('rejects pending and malformed external items', () => {
    expect(isPublicNewsCandidate(makeItem({
      moderation: { trustLabel: 'unverified', confidence: 0.1, moderationState: 'review_pending' }
    }))).toBe(false)
    expect(isPublicNewsCandidate(makeItem({ url: 'javascript:alert(1)' }))).toBe(false)
  })

  it('allows an approved public blog article', () => {
    expect(isPublicNewsCandidate(makeItem({
      id: 'blog_1', originType: 'internal_blog', sourceType: 'community', url: '/blog/new-album'
    }))).toBe(true)
  })

  it('rejects raw social posts even when the social post itself is approved', () => {
    expect(isPublicNewsCandidate(makeItem({
      id: 'post_1', originType: 'internal_post', sourceType: 'community'
    }))).toBe(false)
  })

  it('allows the explicitly public music and legacy event adapters', () => {
    expect(isPublicNewsCandidate(makeItem({
      id: 'music_1', originType: 'internal_post', sourceType: 'community'
    }))).toBe(true)
    expect(isPublicNewsCandidate(makeItem({
      id: 'event_1', originType: 'internal_post', sourceType: 'community'
    }))).toBe(true)
  })

  it('rejects internal event operations and unknown content types', () => {
    expect(isPublicNewsCandidate(makeItem({
      id: 'eventv2_1', originType: 'internal_post', sourceType: 'community'
    }))).toBe(false)
    expect(isPublicNewsCandidate(makeItem({ title: '  ' }))).toBe(false)
  })
})
