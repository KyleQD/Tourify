import { describe, expect, it } from 'vitest'
import { BEAT_DECK_STAGES, getShowEnergy, getShowTier } from '@/lib/arcade/stage-director'

describe('Beat Deck stage direction', () => {
  it('provides original visual variants with unique identifiers', () => {
    expect(BEAT_DECK_STAGES.map(s => s.id)).toEqual(['underground', 'festival', 'neon-city'])
    expect(new Set(BEAT_DECK_STAGES.map(s => s.light)).size).toBe(3)
  })
  it('grows the audience reaction in bounded levels', () => {
    expect([0, 4, 12, 25, 45].map(getShowTier)).toEqual([
      'Soundcheck', 'Warming Up', 'Crowd Favorite', 'Headliner', 'Encore Mode',
    ])
    expect(getShowEnergy(-5)).toBe(0)
    expect(getShowEnergy(45)).toBe(1)
    expect(getShowEnergy(999)).toBe(1)
    expect(getShowEnergy(Number.NaN)).toBe(0)
  })
})
