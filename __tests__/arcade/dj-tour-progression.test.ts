import { describe, expect, it } from 'vitest'
import { getDJVinylDisplay, getNextDJChapter } from '@/lib/arcade/dj-tour-progression'
import { DJ_CHAPTERS } from '@/lib/arcade/dj-world-tour'
import { DJ_RECORDS, DJ_RECORDS_NEEDED } from '@/lib/arcade/dj-quest-level'

describe('DJ Odyssey tour win counter and progression', () => {
  it('caps admission counter at 9/9 while reporting extra records separately', () => {
    expect(getDJVinylDisplay(0)).toEqual({ required: 0, goal: 9, bonus: 0, total: 0, ready: false, label: '0/9' })
    expect(getDJVinylDisplay(8).label).toBe('8/9')
    expect(getDJVinylDisplay(9)).toMatchObject({ label: '9/9', total: 9, bonus: 0, ready: true })
    expect(getDJVinylDisplay(11)).toMatchObject({ label: '9/9', total: 11, bonus: 2, ready: true })
    expect(getDJVinylDisplay(16)).toMatchObject({ label: '9/9', total: 16, bonus: 7, ready: true })
    expect(DJ_RECORDS.length).toBe(15)
    expect(DJ_RECORDS_NEEDED).toBe(9)
  })
  it('guards display formatting from invalid numeric input', () => {
    expect(getDJVinylDisplay(-20).label).toBe('0/9')
    expect(getDJVinylDisplay(NaN).label).toBe('0/9')
    expect(getDJVinylDisplay(Infinity).label).toBe('0/9')
    expect(getDJVinylDisplay(9.8).total).toBe(9)
  })
  it('cycles all six stages in tour order and wraps EOS back to NYC', () => {
    for (let i = 0; i < DJ_CHAPTERS.length; i++) {
      const next = getNextDJChapter(DJ_CHAPTERS[i].id)
      expect(next).toBe(DJ_CHAPTERS[(i + 1) % DJ_CHAPTERS.length].id)
    }
    expect(getNextDJChapter('eos')).toBe('studio54')
    expect(new Set(DJ_CHAPTERS.map(c => c.id)).size).toBe(6)
  })
})
