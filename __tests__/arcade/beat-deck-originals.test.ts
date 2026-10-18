import { describe, expect, it } from 'vitest'
import {
  BEAT_DECK_ORIGINALS, getOriginalSong, beatSeconds, songStepSeconds,
  songTotalSteps, originalSongRoot, songLane, originalSongFrequency,
  getNextOriginalSong,
  createOriginalSongChart,
} from '@/lib/arcade/beat-deck-originals'
import { findHittableNote, judgeTiming } from '@/lib/arcade/rhythm-chart'

describe('Beat Deck original synchronized one-minute soundtracks', () => {
  it('has three unique original minute-long instrumentals with exact musical lengths', () => {
    expect(BEAT_DECK_ORIGINALS).toHaveLength(3)
    expect(new Set(BEAT_DECK_ORIGINALS.map(song => song.id)).size).toBe(3)
    for (const song of BEAT_DECK_ORIGINALS) {
      expect(song.id.startsWith('original:')).toBe(true)
      expect(song.duration).toBe(60)
      expect((songTotalSteps(song) * songStepSeconds(song))).toBeCloseTo(60, 8)
      expect(beatSeconds(song)).toBeCloseTo(60 / song.bpm)
      expect(song.motif).toHaveLength(16)
      expect(song.progression).toHaveLength(4)
      expect(song.tint).toHaveLength(3)
      expect(getOriginalSong(song.id)).toBe(song)
    }
    expect(getOriginalSong('uploaded-not-cleared')).toBeNull()
  })
  it('creates charts that land on actual lead synthesizer onset steps at every difficulty', () => {
    for (const song of BEAT_DECK_ORIGINALS) {
      const easy = createOriginalSongChart(song.id, 'easy')
      const normal = createOriginalSongChart(song.id, 'normal')
      const hard = createOriginalSongChart(song.id, 'hard')
      expect(easy.length).toBeLessThan(normal.length)
      expect(normal.length).toBeLessThan(hard.length)
      for (const chart of [easy, normal, hard]) {
        expect(chart.length).toBeLessThan(260)
        expect(chart.at(0)!.at).toBeGreaterThanOrEqual(2 * beatSeconds(song) - 0.001)
        expect(chart.at(-1)!.at).toBeLessThan(song.duration)
        expect(new Set(chart.map(n => n.id)).size).toBe(chart.length)
        expect(chart.every(note => note.lane >= 0 && note.lane <= 3)).toBe(true)
        for (const note of chart) {
          expect(note.at).toBeCloseTo(Math.round(note.id * songStepSeconds(song) * 1000) / 1000, 6)
          expect(note.lane).toBe(songLane(song, note.id))
          expect(note.id).toBeLessThan(songTotalSteps(song))
        }
        expect(findHittableNote(chart, new Set(), chart[0].lane, chart[0].at)).toEqual(chart[0])
        expect(judgeTiming(0)).toBe('perfect')
      }
    }
  })
  it('has deterministic stage, harmonic progression and correctly pitched frequencies', () => {
    expect(BEAT_DECK_ORIGINALS.map(song => song.stage)).toEqual(['neon-city', 'festival', 'underground'])
    expect(originalSongFrequency(69)).toBe(440)
    for (const song of BEAT_DECK_ORIGINALS) {
      expect(originalSongRoot(song, 0)).toBe(song.progression[0])
      expect(originalSongRoot(song, 32)).toBe(song.progression[1])
      expect(originalSongRoot(song, 128)).toBe(song.progression[0])
      expect(createOriginalSongChart(song.id, 'normal')).toEqual(createOriginalSongChart(song.id, 'normal'))
    }
  })
  it('offers the next song in playlist order and wraps the third track', () => {
    expect(getNextOriginalSong('original:midnight-circuit').id).toBe('original:festival-lights')
    expect(getNextOriginalSong('original:festival-lights').id).toBe('original:coastal-frequency')
    expect(getNextOriginalSong('original:coastal-frequency').id).toBe('original:midnight-circuit')
    expect(getNextOriginalSong('missing').id).toBe('original:midnight-circuit')
  })

})
