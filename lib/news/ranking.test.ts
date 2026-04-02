import { describe, expect, it } from 'vitest'

import { applyCursorPagination, decodeNewsCursor, encodeNewsCursor, rankNewsItem, sortNewsByScore } from '@/lib/news/ranking'
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
    score: overrides.score || 0
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
      subscribedSourceNames: new Set()
    })
    const rankedB = rankNewsItem({
      item: base,
      subscribedTopics: new Set(),
      subscribedSourceNames: new Set()
    })
    expect(rankedA.score).toBeGreaterThan(rankedB.score)
  })

  it('sorts by score then published date', () => {
    const newer = makeItem({ id: 'new', score: 0.8, publishedAt: '2026-01-02T00:00:00.000Z' })
    const older = makeItem({ id: 'old', score: 0.8, publishedAt: '2026-01-01T00:00:00.000Z' })
    const sorted = sortNewsByScore([older, newer])
    expect(sorted[0].id).toBe('new')
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
})
