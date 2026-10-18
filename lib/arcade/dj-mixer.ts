/** Equal-power crossfade for two original synth decks. */
export function getDJMixLevels(position: number): { a: number; b: number } {
  const value = Number.isFinite(position) ? Math.max(0, Math.min(100, position)) : 50
  const angle = value / 100 * Math.PI / 2
  return { a: Math.cos(angle), b: Math.sin(angle) }
}
export const DJ_DECK_NOTES = {
  a: [110, 110, 146.83, 164.81, 110, 146.83, 196, 164.81],
  b: [329.63, 0, 392, 440, 293.66, 0, 392, 523.25],
} as const
