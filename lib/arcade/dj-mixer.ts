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

/** Venue-inspired ORIGINAL synth frequencies, never extracted from uploaded music. */
export const DJ_EOS_SUNSET_NOTES = {
  a: [130.81, 130.81, 164.81, 196, 130.81, 164.81, 174.61, 196],
  b: [392, 0, 440, 523.25, 349.23, 0, 440, 392],
} as const

export function getDJVenueSet(venueName: string) {
  if (venueName === 'EOS Lounge') {
    return {
      notes: DJ_EOS_SUNSET_NOTES,
      aName: 'Coastal Bass',
      bName: 'Sunset Keys',
      title: 'Santa Barbara sunset encore',
    }
  }
  return {
    notes: DJ_DECK_NOTES,
    aName: 'Bassline',
    bName: 'Starlight',
    title: 'Play your encore',
  }
}
