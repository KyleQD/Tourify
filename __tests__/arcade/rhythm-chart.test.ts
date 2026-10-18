import { describe, expect, it } from 'vitest'
import { createPracticeChart, findHittableNote, judgeTiming } from '@/lib/arcade/rhythm-chart'

describe('Beat Deck practice chart', () => {
  it('generates stable notes for the same song seed', () => {
    expect(createPracticeChart(120, 25, 'track-a')).toEqual(createPracticeChart(120, 25, 'track-a'))
    expect(createPracticeChart(120, 25, 'track-a')).not.toEqual(createPracticeChart(120, 25, 'track-b'))
  })
  it('bounds tempo, duration, and note count', () => {
    const notes = createPracticeChart(Infinity, 999999, 'bad')
    expect(notes.length).toBeLessThanOrEqual(600)
    expect(notes.length).toBeGreaterThan(0)
    expect(notes.every(n => n.lane >= 0 && n.lane <= 3)).toBe(true)
    expect(notes.at(-1)!.at).toBeLessThan(300)
  })
  it('scores hits only inside timing window for the selected lane', () => {
    const notes = createPracticeChart(110, 30)
    const first = notes[0]
    expect(findHittableNote(notes, new Set(), first.lane, first.at)).toEqual(first)
    expect(findHittableNote(notes, new Set([first.id]), first.lane, first.at)?.id).not.toBe(first.id)
    expect(judgeTiming(0.04)).toBe('perfect')
    expect(judgeTiming(-0.12)).toBe('good')
    expect(judgeTiming(0.3)).toBe('miss')
  })
})
