import { nextNewsPollAt } from '@/lib/news/ingestion/poll-policy'

const now = new Date('2026-10-18T09:00:00Z')
const sourceId = 'publisher-a'

describe('news source scheduling policy', () => {
  it('sets a faster interval for high-priority active sources', () => {
    const base = { sourceId, failedAttempts: 0, previousSucceeded: true, now }
    const high = Date.parse(nextNewsPollAt({ ...base, priority: 1 })) - now.getTime()
    const slow = Date.parse(nextNewsPollAt({ ...base, priority: 3 })) - now.getTime()
    expect(high).toBeGreaterThan(14 * 60_000)
    expect(high).toBeLessThan(16 * 60_000)
    expect(slow).toBeGreaterThan(high)
  })

  it('applies exponential backoff to failed sources', () => {
    const base = { sourceId, priority: 1 as const, previousSucceeded: false, now }
    const earlier = Date.parse(nextNewsPollAt({ ...base, failedAttempts: 1 }))
    const later = Date.parse(nextNewsPollAt({ ...base, failedAttempts: 3 }))
    expect(later).toBeGreaterThan(earlier)
  })

  it('honors larger retry-after headers when capped', () => {
    const result = Date.parse(nextNewsPollAt({
      sourceId, priority: 1, previousSucceeded: false, failedAttempts: 0,
      now, retryAfterSeconds: 60 * 60
    }))
    expect(result - now.getTime()).toBeGreaterThanOrEqual(60 * 60_000)
  })

  it('is deterministic for the same publisher and time', () => {
    const input = { sourceId, priority: 2 as const, previousSucceeded: true, failedAttempts: 0, now }
    expect(nextNewsPollAt(input)).toBe(nextNewsPollAt(input))
  })
})
