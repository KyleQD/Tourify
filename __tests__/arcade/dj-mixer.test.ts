import { describe, expect, it } from 'vitest'
import { DJ_DECK_NOTES, DJ_EOS_SUNSET_NOTES, getDJVenueSet, getDJMixLevels } from '@/lib/arcade/dj-mixer'

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
  it('gives EOS an original sunset set while keeping every other booth unchanged', () => {
    const eos = getDJVenueSet('EOS Lounge')
    const nyc = getDJVenueSet('Studio 54')
    expect(eos.aName).toBe('Coastal Bass')
    expect(eos.bName).toBe('Sunset Keys')
    expect(eos.title).toContain('Santa Barbara')
    expect(eos.notes).toEqual(DJ_EOS_SUNSET_NOTES)
    expect(nyc.notes).toEqual(DJ_DECK_NOTES)
    expect(getDJVenueSet('Tresor Berlin')).toEqual(nyc)
    expect(eos.notes).not.toEqual(nyc.notes)
  })
  it('uses original, finite practice synthesizer notes', () => {
    for (const notes of [...Object.values(DJ_DECK_NOTES), ...Object.values(DJ_EOS_SUNSET_NOTES)]) {
      expect(notes).toHaveLength(8)
      expect(notes.every(note => Number.isFinite(note) && note >= 0)).toBe(true)
    }
  })
})
