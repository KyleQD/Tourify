import { composeIndexedNewsFeed } from '@/lib/news/index/compose'
import type { ComposableNewsItem, IndexedNewsOrigin } from '@/lib/news/index/contracts'

function items(origin: IndexedNewsOrigin, count: number, prefix: string): ComposableNewsItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`, origin, clusterId: `${prefix}-cluster-${i}`,
    sourceId: `${prefix}-publisher-${i % 10}`, score: 1 - i * 0.001
  }))
}

describe('indexed News feed composition', () => {
  it('balances a 20-card feed at 45/35/20 when enough quality candidates exist', () => {
    const result = composeIndexedNewsFeed([
      ...items('rss', 30, 'r'),
      ...items('community', 30, 'c'),
      ...items('editorial', 30, 'e')
    ], { limit: 20 })
    expect(result).toHaveLength(20)
    expect(result.filter(i => i.origin === 'rss')).toHaveLength(9)
    expect(result.filter(i => i.origin === 'community')).toHaveLength(7)
    expect(result.filter(i => i.origin === 'editorial')).toHaveLength(4)
  })

  it('backfills missing categories instead of injecting low-quality placeholders', () => {
    const result = composeIndexedNewsFeed(items('rss', 24, 'r'), { limit: 20 })
    expect(result).toHaveLength(20)
    expect(result.every(i => i.origin === 'rss')).toBe(true)
  })

  it('never duplicates a story cluster or an item', () => {
    const pool = items('rss', 10, 'r')
    pool[1].clusterId = pool[0].clusterId
    pool.push({ ...pool[2] })
    const result = composeIndexedNewsFeed(pool, { limit: 20 })
    expect(new Set(result.map(i => i.clusterId)).size).toBe(result.length)
    expect(new Set(result.map(i => i.id)).size).toBe(result.length)
  })

  it('enforces source diversity where alternatives exist', () => {
    const pool = items('rss', 8, 'r')
    for (let i = 0; i < 5; i++) pool[i].sourceId = 'publisher-a'
    const result = composeIndexedNewsFeed(pool, { limit: 6, maxPerSource: 2 })
    // Source cap can relax only when remaining alternatives are exhausted.
    expect(result.slice(0, 5).filter(x => x.sourceId === 'publisher-a').length).toBeLessThanOrEqual(2)
  })

  it('rejects candidates with invalid scores', () => {
    expect(composeIndexedNewsFeed([{
      ...items('rss', 1, 'r')[0], score: Number.NaN
    }], { limit: 20 })).toEqual([])
  })
})
