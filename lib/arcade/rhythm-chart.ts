export const LANE_KEYS = ['d', 'f', 'j', 'k'] as const
export type Lane = 0 | 1 | 2 | 3
export type RhythmDifficulty = 'easy' | 'normal' | 'hard'
export const RHYTHM_DIFFICULTIES = ['easy', 'normal', 'hard'] as const
export interface BeatNote { id: number; at: number; lane: Lane }

// A deterministic, tempo-adjustable PRACTICE chart. It is intentionally not
// advertised as automatic music transcription or beat detection.
export function createPracticeChart(bpm: number, durationSeconds = 30, seed = 'practice', difficulty: RhythmDifficulty = 'normal'): BeatNote[] {
  const safeBpm = Math.min(200, Math.max(65, Number.isFinite(bpm) ? bpm : 110))
  const duration = Math.min(300, Math.max(4, Number.isFinite(durationSeconds) ? durationSeconds : 30))
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0
  const beat = 60 / safeBpm
  const stride = difficulty === 'easy' ? beat * 2 : difficulty === 'hard' ? beat / 2 : beat
  const notes: BeatNote[] = []
  // Leave an opening beat for visual acquisition, and stop short of audio end.
  for (let t = beat * 2, i = 0; t < duration - beat && notes.length < 600; t += stride, i++) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0
    // Include occasional rests so the pattern breathes.
    if (difficulty !== 'hard' && i % 8 === 7) continue
    notes.push({ id: i, at: Math.round(t * 1000) / 1000, lane: (hash % 4) as Lane })
  }
  return notes
}

export type Judgement = 'perfect' | 'good' | 'miss'
export const RHYTHM_HIT_WINDOW_SECONDS = 0.17
export function judgeTiming(errorSeconds: number): Judgement {
  const distance = Math.abs(errorSeconds)
  if (distance <= 0.075) return 'perfect'
  if (distance <= RHYTHM_HIT_WINDOW_SECONDS) return 'good'
  return 'miss'
}

export function findHittableNote(notes: readonly BeatNote[], handledIds: ReadonlySet<number>, lane: Lane, currentTime: number) {
  let best: BeatNote | null = null
  let bestDistance = RHYTHM_HIT_WINDOW_SECONDS
  for (const note of notes) {
    if (note.lane !== lane || handledIds.has(note.id)) continue
    const distance = Math.abs(note.at - currentTime)
    if (distance <= bestDistance) { best = note; bestDistance = distance }
    if (note.at > currentTime + RHYTHM_HIT_WINDOW_SECONDS) break
  }
  return best
}
