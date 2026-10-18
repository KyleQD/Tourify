import { describe, expect, it } from 'vitest'
import { normalizeArcadeScore, readPersonalBest, savePersonalBest } from '@/lib/arcade/personal-best'

describe('device-only arcade records', () => {
  it('sanitizes corrupt, negative, non-finite or huge browser values', () => {
    expect(normalizeArcadeScore('3500.8')).toBe(3500)
    expect(normalizeArcadeScore(null)).toBe(0)
    expect(normalizeArcadeScore('NaN')).toBe(0)
    expect(normalizeArcadeScore(Infinity)).toBe(0)
    expect(normalizeArcadeScore(-5)).toBe(0)
    expect(normalizeArcadeScore(1e20)).toBe(1_000_000_000)
  })

  it('does not require browser storage during SSR or test rendering', () => {
    expect(readPersonalBest('beat-deck', 'practice:normal')).toBe(0)
    expect(savePersonalBest('beat-deck', 'practice:normal', 1200)).toBe(1200)
  })
})
