import {
  applyCursorPagination,
  decodeNewsCursor,
  encodeNewsCursor,
  getEngagementValue,
  rankNewsItem,
  sortNewsByEngagement,
  sortNewsByRecent,
  sortNewsByScore,
  sortNewsItems
} from '@/lib/news/ranking'
import { itemMatchesCategory } from '@/lib/news/feed-service'
import type { NewsFeedItem } from '@/lib/news/types'

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: overrides.id || 'item-1',
    originType: overrides.originType || 'external',
    sourceType: overrides.sourceType || 'publisher',
    sourceName: overrides.sourceName || 'Pitchfork',
    title: overrides.title || 'Title',
    summary: overrides.summary || 'Summary',
    publishedAt: overrides.publishedAt || new Date().toISOString(),
    topics: overrides.topics || ['Music News'],
    metrics: overrides.metrics || { likes: 1, comments: 1, shares: 1, views: 1 },
    moderation: overrides.moderation || {
      trustLabel: 'verified_source',
      confidence: 0.9,
      moderationState: 'approved'
    },
    relevanceScore: overrides.relevanceScore || 0,
    score: overrides.score || 0,
    pressFormat: overrides.pressFormat
  }
}

describe('news ranking', () => {
  it('encodes and decodes cursor values', () => {
    const cursor = {
      id: 'item-cursor',
      publishedAt: new Date().toISOString(),
      score: 0.75
    }
    const encoded = encodeNewsCursor(cursor)
    expect(decodeNewsCursor(encoded)).toEqual(cursor)
  })

  it('ranks subscribed topics higher than non-subscribed', () => {
    const base = makeItem({ topics: ['Hip-Hop'] })
    const rankedA = rankNewsItem({
      item: base,
      subscribedTopics: new Set(['hip-hop']),
      subscribedSourceNames: new Set(),
      interactionTopics: new Set(),
      preferredLocations: new Set(),
    })
    const rankedB = rankNewsItem({
      item: base,
      subscribedTopics: new Set(),
      subscribedSourceNames: new Set(),
      interactionTopics: new Set(),
      preferredLocations: new Set(),
    })
    expect(rankedA.score).toBeGreaterThan(rankedB.score)
  })

  it('sorts by score then published date', () => {
    const newer = makeItem({ id: 'new', score: 0.8, publishedAt: '2026-01-02T00:00:00.000Z' })
    const older = makeItem({ id: 'old', score: 0.8, publishedAt: '2026-01-01T00:00:00.000Z' })
    const sorted = sortNewsByScore([older, newer])
    expect(sorted[0].id).toBe('new')
  })

  it('sorts by engagement then published date', () => {
    const high = makeItem({
      id: 'high',
      publishedAt: '2026-01-01T00:00:00.000Z',
      metrics: { likes: 100, comments: 10, shares: 5, views: 1000 }
    })
    const low = makeItem({
      id: 'low',
      publishedAt: '2026-01-02T00:00:00.000Z',
      metrics: { likes: 1, comments: 0, shares: 0, views: 10 }
    })
    const sorted = sortNewsByEngagement([low, high])
    expect(sorted[0].id).toBe('high')
    expect(getEngagementValue(high)).toBeGreaterThan(getEngagementValue(low))
  })

  it('sorts by recent published date', () => {
    const newer = makeItem({ id: 'new', publishedAt: '2026-01-02T00:00:00.000Z', score: 0.1 })
    const older = makeItem({ id: 'old', publishedAt: '2026-01-01T00:00:00.000Z', score: 0.9 })
    const sorted = sortNewsByRecent([older, newer])
    expect(sorted[0].id).toBe('new')
    expect(sortNewsItems([older, newer], 'recent')[0].id).toBe('new')
  })

  it('applies cursor pagination boundaries correctly', () => {
    const items = sortNewsByScore([
      makeItem({ id: 'c', score: 0.9, publishedAt: '2026-01-03T00:00:00.000Z' }),
      makeItem({ id: 'b', score: 0.8, publishedAt: '2026-01-02T00:00:00.000Z' }),
      makeItem({ id: 'a', score: 0.7, publishedAt: '2026-01-01T00:00:00.000Z' })
    ])

    const firstPage = applyCursorPagination({ items, cursor: null, limit: 2 })
    expect(firstPage.pageItems).toHaveLength(2)
    expect(firstPage.nextCursor).toBeTruthy()

    const secondCursor = decodeNewsCursor(firstPage.nextCursor || undefined)
    const secondPage = applyCursorPagination({ items, cursor: secondCursor, limit: 2 })
    expect(secondPage.pageItems).toHaveLength(1)
    expect(secondPage.pageItems[0].id).toBe('a')
  })

  it('paginates recent sort by published date', () => {
    const items = sortNewsByRecent([
      makeItem({ id: 'c', publishedAt: '2026-01-03T00:00:00.000Z' }),
      makeItem({ id: 'b', publishedAt: '2026-01-02T00:00:00.000Z' }),
      makeItem({ id: 'a', publishedAt: '2026-01-01T00:00:00.000Z' })
    ])

    const firstPage = applyCursorPagination({ items, cursor: null, limit: 2, sort: 'recent' })
    expect(firstPage.pageItems.map(item => item.id)).toEqual(['c', 'b'])

    const secondCursor = decodeNewsCursor(firstPage.nextCursor || undefined)
    const secondPage = applyCursorPagination({ items, cursor: secondCursor, limit: 2, sort: 'recent' })
    expect(secondPage.pageItems.map(item => item.id)).toEqual(['a'])
  })
})

describe('news category matching', () => {
  it('matches blog pressFormat to gossip', () => {
    const blog = makeItem({
      id: 'blog_1',
      originType: 'internal_blog',
      pressFormat: 'blog',
      moderation: { trustLabel: 'community_report', confidence: 0.74, moderationState: 'approved' }
    })
    expect(itemMatchesCategory(blog, 'gossip')).toBe(true)
    expect(itemMatchesCategory(blog, 'articles')).toBe(false)
  })

  it('matches article pressFormat to articles', () => {
    const article = makeItem({
      id: 'blog_2',
      originType: 'internal_blog',
      pressFormat: 'article',
      topics: ['Articles', 'Community'],
      moderation: { trustLabel: 'community_report', confidence: 0.74, moderationState: 'approved' }
    })
    expect(itemMatchesCategory(article, 'articles')).toBe(true)
    expect(itemMatchesCategory(article, 'gossip')).toBe(false)
  })

  it('keeps keyword buzz in gossip without blog format', () => {
    const buzz = makeItem({
      id: 'post_1',
      originType: 'internal_post',
      title: 'Viral rumor around the festival',
      moderation: { trustLabel: 'community_report', confidence: 0.58, moderationState: 'review_pending' }
    })
    expect(itemMatchesCategory(buzz, 'gossip')).toBe(true)
  })
})
