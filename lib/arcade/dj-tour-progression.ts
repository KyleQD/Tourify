import { DJ_RECORDS_NEEDED } from './dj-quest-level'
import { DJ_CHAPTERS, type DJChapterId } from './dj-world-tour'

/** Guestlist admission is a threshold, not the total collectible count. */
export function getDJVinylDisplay(rawCollected: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(rawCollected) ? rawCollected : 0))
  const required = Math.min(DJ_RECORDS_NEEDED, safe)
  return {
    required,
    goal: DJ_RECORDS_NEEDED,
    bonus: Math.max(0, safe - DJ_RECORDS_NEEDED),
    total: safe,
    ready: safe >= DJ_RECORDS_NEEDED,
    label: required + '/' + DJ_RECORDS_NEEDED,
  }
}

/** The world tour is circular: final Santa Barbara chapter returns to NYC. */
export function getNextDJChapter(current: DJChapterId): DJChapterId {
  const index = DJ_CHAPTERS.findIndex(c => c.id === current)
  return DJ_CHAPTERS[(index + 1) % DJ_CHAPTERS.length].id
}
