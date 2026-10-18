/** Original Arcade stage designs: pure data, no music licensing or networking. */
export type BeatDeckStage = 'underground' | 'festival' | 'neon-city'

export interface BeatDeckStageTheme {
  id: BeatDeckStage
  name: string
  sky: string
  horizon: string
  floor: string
  light: string
  secondary: string
}

export const BEAT_DECK_STAGES: readonly BeatDeckStageTheme[] = [
  { id: 'underground', name: 'Underground Club', sky: '#120b27', horizon: '#341541', floor: '#090d26', light: '#f472b6', secondary: '#a78bfa' },
  { id: 'festival', name: 'Festival Main Stage', sky: '#101733', horizon: '#303368', floor: '#080f23', light: '#fbbf24', secondary: '#38bdf8' },
  { id: 'neon-city', name: 'Neon Skyline', sky: '#071b35', horizon: '#173c4f', floor: '#0c1025', light: '#2dd4bf', secondary: '#e879f9' },
] as const

export type ShowTier = 'Soundcheck' | 'Warming Up' | 'Crowd Favorite' | 'Headliner' | 'Encore Mode'

export function getShowTier(combo: number): ShowTier {
  const safeCombo = Number.isFinite(combo) ? Math.max(0, Math.floor(combo)) : 0
  if (safeCombo >= 45) return 'Encore Mode'
  if (safeCombo >= 25) return 'Headliner'
  if (safeCombo >= 12) return 'Crowd Favorite'
  if (safeCombo >= 4) return 'Warming Up'
  return 'Soundcheck'
}

export function getShowEnergy(combo: number): number {
  const safeCombo = Number.isFinite(combo) ? Math.max(0, combo) : 0
  return Math.min(1, safeCombo / 45)
}
