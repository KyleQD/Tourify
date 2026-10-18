import { describe, expect, it } from 'vitest'
import { explainUnscoredPress, isRhythmEditableTarget, laneFromKeyboardEvent } from '@/lib/arcade/rhythm-input'
import { createPracticeChart, findHittableNote, LANE_KEYS } from '@/lib/arcade/rhythm-chart'

describe('Beat Deck keyboard input regression', () => {
  it('recognizes every advertised key regardless of case or physical-code fallback', () => {
    for (let lane = 0; lane < 4; lane++) {
      const key = LANE_KEYS[lane]
      expect(laneFromKeyboardEvent({ key })).toBe(lane)
      expect(laneFromKeyboardEvent({ key: key.toUpperCase() })).toBe(lane)
      expect(laneFromKeyboardEvent({ key: 'Unidentified', code: 'Key' + key.toUpperCase() })).toBe(lane)
    }
    expect(laneFromKeyboardEvent({ key: 'a' })).toBeNull()
    expect(laneFromKeyboardEvent({ key: 'd', ctrlKey: true })).toBeNull()
    expect(laneFromKeyboardEvent({ key: 'f', metaKey: true })).toBeNull()
    expect(laneFromKeyboardEvent({ key: 'j', altKey: true })).toBeNull()
    expect(laneFromKeyboardEvent({ key: 'k', isComposing: true })).toBeNull()
  })

  it('leaves text fields, contenteditable and rich editors alone', () => {
    expect(isRhythmEditableTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isRhythmEditableTarget({ tagName: 'textarea' })).toBe(true)
    expect(isRhythmEditableTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isRhythmEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isRhythmEditableTarget({ tagName: 'SPAN', closest: () => ({}) })).toBe(true)
    expect(isRhythmEditableTarget({ tagName: 'CANVAS' })).toBe(false)
    expect(isRhythmEditableTarget(null)).toBe(false)
  })

  it('distinguishes key recognition from being early, late or out of notes', () => {
    const notes = createPracticeChart(110, 30, 'recognition')
    const first = notes[0]
    expect(explainUnscoredPress(notes, new Set(), first.lane, first.at - 0.5)).toBe('early')
    expect(explainUnscoredPress(notes, new Set(), first.lane, 40)).toBe('late')
    expect(explainUnscoredPress(notes, new Set(notes.map(note => note.id)), first.lane, 3)).toBe('no-note')
    expect(findHittableNote(notes, new Set(), first.lane, first.at)).toEqual(first)
  })
})
