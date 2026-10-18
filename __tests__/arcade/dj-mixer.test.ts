import { describe, expect, it } from 'vitest'
import { DJ_DECK_NOTES, getDJMixLevels } from '@/lib/arcade/dj-mixer'

describe('DJ booth crossfader', () => {
  it('uses bounded equal-power mix levels', () => {
    expect(getDJMixLevels(0).a).toBeCloseTo(1)
    expect(getDJMixLevels(0).b).toBeCloseTo(0)
    expect(getDJMixLevels(100).b).toBeCloseTo(1)
    expect(getDJMixLevels(100).a).toBeCloseTo(0)
    expect(getDJMixLevels(50).a).toBeCloseTo(getDJMixLevels(50).b)
    expect(getDJMixLevels(-100).a).toBeCloseTo(1)
    expect(getDJMixLevels(1000).b).toBeCloseTo(1)
    expect(getDJMixLevels(NaN)).toEqual(getDJMixLevels(50))
  })
  it('uses original, finite practice synthesizer notes', () => {
    for (const notes of Object.values(DJ_DECK_NOTES)) {
      expect(notes).toHaveLength(8)
      expect(notes.every(note => Number.isFinite(note) && note >= 0)).toBe(true)
    }
  })
})
