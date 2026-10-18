/**
 * Arcade records are per-browser convenience stats, not authoritative
 * leaderboards. Never use values read from localStorage for rewards, cash,
 * achievements, competitive ranks or security decisions.
 */
const PREFIX = 'tourify.arcade.personal-best.v1.'

export function normalizeArcadeScore(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.min(1_000_000_000, Math.floor(n)) : 0
}

function storageKey(game: string, variant: string) {
  return PREFIX + encodeURIComponent(game.slice(0, 60)) + '.' + encodeURIComponent(variant.slice(0, 100))
}

export function readPersonalBest(game: string, variant = 'default'): number {
  if (typeof window === 'undefined') return 0
  try {
    return normalizeArcadeScore(window.localStorage.getItem(storageKey(game, variant)))
  } catch {
    return 0
  }
}

export function savePersonalBest(game: string, variant: string, score: number): number {
  const previous = readPersonalBest(game, variant)
  const best = Math.max(previous, normalizeArcadeScore(score))
  if (typeof window !== 'undefined' && best > previous) {
    try { window.localStorage.setItem(storageKey(game, variant), String(best)) }
    catch { /* Storage blocked or full; gameplay must continue. */ }
  }
  return best
}
