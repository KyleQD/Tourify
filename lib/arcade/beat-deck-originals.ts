import type { BeatNote, Lane, RhythmDifficulty } from './rhythm-chart'
import type { BeatDeckStage } from './stage-director'

/**
 * Three entirely original 60-second generative instrumental compositions.
 * Musical timing is the single source of truth for both the synth sequencer
 * and the four-lane Beat Deck score chart. No external recordings or samples.
 */
export type BeatDeckOriginalId =
  | 'original:midnight-circuit'
  | 'original:festival-lights'
  | 'original:coastal-frequency'

export interface BeatDeckOriginalSong {
  id: BeatDeckOriginalId
  title: string
  genre: string
  description: string
  bpm: number
  duration: 60
  stage: BeatDeckStage
  key: string
  motif: readonly number[]
  progression: readonly number[]
  tint: readonly [string, string, string]
}

export const BEAT_DECK_ORIGINALS: readonly BeatDeckOriginalSong[] = [
  {
    id: 'original:midnight-circuit', title: 'Midnight Circuit',
    genre: 'Synthwave · Electro', description: 'Midnight arpeggios, analog bass and neon-lit drums.',
    bpm: 120, duration: 60, stage: 'neon-city', key: 'A minor',
    motif: [0, 3, 7, 12, 7, 3, 10, 7, 0, 3, 7, 15, 12, 10, 7, 3],
    progression: [45, 41, 43, 40], tint: ['#080d29', '#482259', '#ee74b7'],
  },
  {
    id: 'original:festival-lights', title: 'Festival Lights',
    genre: 'Festival House · Electro', description: 'An arena-sized four-on-the-floor, rising chords and festival leads.',
    bpm: 128, duration: 60, stage: 'festival', key: 'D minor',
    motif: [0, 7, 10, 12, 10, 7, 5, 3, 0, 5, 7, 12, 15, 12, 10, 7],
    progression: [38, 34, 36, 33], tint: ['#0a143e', '#365eb2', '#fcd34d'],
  },
  {
    id: 'original:coastal-frequency', title: 'Coastal Frequency',
    genre: 'Nu Disco · Sunset Funk', description: 'Warm Rhodes-style chords, a bouncy bassline and a sunset groove.',
    bpm: 100, duration: 60, stage: 'underground', key: 'C major',
    motif: [0, 4, 7, 11, 12, 7, 4, 2, 0, 4, 9, 12, 11, 7, 4, 2],
    progression: [36, 41, 33, 43], tint: ['#10344f', '#ab668b', '#ffd19d'],
  },
] as const

export function getOriginalSong(id: string): BeatDeckOriginalSong | null {
  return BEAT_DECK_ORIGINALS.find(song => song.id === id) ?? null
}
export function beatSeconds(song: BeatDeckOriginalSong): number {
  return 60 / song.bpm
}
export function songStepSeconds(song: BeatDeckOriginalSong): number {
  return 30 / song.bpm
}
export function songTotalSteps(song: BeatDeckOriginalSong): number {
  return Math.round(song.duration / songStepSeconds(song))
}
export function originalSongRoot(song: BeatDeckOriginalSong, step: number): number {
  return song.progression[Math.floor(Math.max(0, step) / 32) % song.progression.length]
}
/** Scored onsets correspond exactly to melody transients heard in the synth. */
export function songLane(song: BeatDeckOriginalSong, step: number): Lane {
  const degree = song.motif[Math.floor(Math.max(0, step) / 2) % song.motif.length]
  const turn = Math.floor(step / 32)
  return Math.abs(Math.floor((degree + turn * 3 + (step % 2 ? 1 : 0)) % 4)) as Lane
}
export function createOriginalSongChart(
  id: string,
  difficulty: RhythmDifficulty = 'normal',
): BeatNote[] {
  const song = getOriginalSong(id)
  if (!song) return []
  const stepTime = songStepSeconds(song)
  const every = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 1 : 2
  const notes: BeatNote[] = []
  for (let step = 4; step < songTotalSteps(song) - 2; step += every) {
    // Never add off-beat chart notes without actual accompanying lead audio.
    notes.push({
      id: step,
      at: Math.round(step * stepTime * 1000) / 1000,
      lane: songLane(song, step),
    })
  }
  return notes
}

export function originalSongFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** A completed set can reveal the next original track, without autoplaying it. */
export function getNextOriginalSong(currentId: string): BeatDeckOriginalSong {
  const index = BEAT_DECK_ORIGINALS.findIndex(song => song.id === currentId)
  return BEAT_DECK_ORIGINALS[(index + 1) % BEAT_DECK_ORIGINALS.length]
}
