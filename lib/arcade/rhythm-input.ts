import { LANE_KEYS, type BeatNote, type Lane } from './rhythm-chart'

/** Resolve the four advertised lanes independently of keyboard letter casing.
 * The physical key code is a fallback for browsers/layouts where event.key
 * does not contain a Latin letter. */
export function laneFromKeyboardEvent(event: {
  key?: string
  code?: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  isComposing?: boolean
}): Lane | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return null
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
  const index = LANE_KEYS.indexOf(key as typeof LANE_KEYS[number])
  if (index !== -1) return index as Lane
  const byCode: Record<string, Lane> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 }
  return Object.prototype.hasOwnProperty.call(byCode, event.code || '')
    ? byCode[event.code!]
    : null
}

/** Avoid consuming keystrokes while someone types elsewhere in Tourify. */
export function isRhythmEditableTarget(target: {
  tagName?: string
  isContentEditable?: boolean
  closest?: (selector: string) => unknown
} | null): boolean {
  if (!target) return false
  const tag = target.tagName?.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest?.('[contenteditable="true"],[role="textbox"]'))
}

export type LanePressResult = 'early' | 'late' | 'no-note'

/** Timing explanation for a registered keypress that did not score a note.
 * The keyboard working and the timing being accurate are separate facts. */
export function explainUnscoredPress(
  notes: readonly BeatNote[],
  handledIds: ReadonlySet<number>,
  lane: Lane,
  currentTime: number,
): LanePressResult {
  if (!Number.isFinite(currentTime)) return 'no-note'
  let closest: BeatNote | null = null
  let best = Number.POSITIVE_INFINITY
  for (const note of notes) {
    if (note.lane !== lane || handledIds.has(note.id)) continue
    const delta = note.at - currentTime
    const distance = Math.abs(delta)
    if (distance < best) { closest = note; best = distance }
  }
  if (!closest) return 'no-note'
  return closest.at > currentTime ? 'early' : 'late'
}
