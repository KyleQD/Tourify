/**
 * Shared types for the Discover globe (no server-only imports so client
 * components can consume them safely).
 */

export const GLOBE_SCHEMA_VERSION = "world-globe-v0.1"

export const PILOT_KEYS = [
  "detroit",
  "kingston",
  "lagos",
  "london",
  "tokyo",
  // P18 Wave 2 — same corpus contract, no region-specific code paths.
  "new-orleans",
  "bronx",
  "chicago",
  "havana",
  "rio-de-janeiro",
] as const
export type PilotKey = (typeof PILOT_KEYS)[number]

export interface GlobeMarkerCounts {
  artists: number
  recordings: number
  milestones: number
  genresAndScenes: number
  instruments: number
  landmarks: number
}

export interface GlobePlace {
  key: PilotKey
  canonicalPath: string
  name: string
  countryName: string
  countryCode: string | null
  center: { lat: number; lng: number }
  musicalIdentity: string | null
  counts: GlobeMarkerCounts
  /** Drives marker size / glow intensity on the globe. */
  weight: number
}

export interface GlobeIndex {
  schemaVersion: string
  generatedAt: string
  places: GlobePlace[]
}
