import { describe, expect, it } from 'vitest'
import { CrossPlatformPostingService } from '@/lib/services/cross-platform-posting.service'

describe('CrossPlatformPostingService.flattenHashtagGroups', () => {
  const service = new CrossPlatformPostingService()

  it('flattens string arrays', () => {
    expect(service.flattenHashtagGroups(['tour', '#live', '  '])).toEqual(['tour', 'live'])
  })

  it('flattens nested arrays (legacy create shape)', () => {
    expect(service.flattenHashtagGroups([['a', 'b'], ['b', 'c']])).toEqual(['a', 'b', 'c'])
  })

  it('reads hashtags from objects', () => {
    expect(service.flattenHashtagGroups([{ hashtags: ['x', '#y'] }])).toEqual(['x', 'y'])
  })

  it('returns empty for non-arrays', () => {
    expect(service.flattenHashtagGroups(null)).toEqual([])
    expect(service.flattenHashtagGroups({})).toEqual([])
  })
})
