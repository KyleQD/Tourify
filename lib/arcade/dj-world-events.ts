import { intersects, type Rect } from './dj-quest-level'
import type { DJChapterId } from './dj-world-tour'

/** Original location-specific Arcade gameplay, independent of uploaded songs. */
export type DJWorldFeature =
  | { id: string; kind: 'launch-pad'; name: string; x: number; y: number; w: number; h: number; strength: number }
  | { id: string; kind: 'surf-hazard'; name: string; x: number; y: number; w: number; h: number; patrol: number; speed: number }
  | { id: string; kind: 'record-crate'; name: string; x: number; y: number; w: number; h: number; points: number }
  | { id: string; kind: 'patio-lights'; name: string; x: number; y: number; w: number; h: number }

export const DJ_WORLD_FEATURES: Record<DJChapterId, readonly DJWorldFeature[]> = {
  studio54: [],
  whisky: [],
  amnesia: [],
  fabric: [],
  tresor: [],
  eos: [
    // Riding a pier launch-pad is optional but offers another way to reach high vinyl.
    { id: 'pier-boost', kind: 'launch-pad', name: 'Wharf launch pad', x: 314, y: 290, w: 62, h: 12, strength: -690 },
    // A clearly outlined, moving wave obstacle can be jumped over.
    { id: 'shore-break', kind: 'surf-hazard', name: 'Rolling beach wave', x: 715, y: 339, w: 29, h: 26, patrol: 46, speed: 1.5 },
    // Bonus is granted just once per run and remains collected on checkpoint respawn.
    { id: 'record-store', kind: 'record-crate', name: 'State Street record crate', x: 1425, y: 327, w: 38, h: 36, points: 500 },
    // Destination-specific ambience; purely visual (no random scoring).
    { id: 'eos-encore', kind: 'patio-lights', name: 'Garden dance floor', x: 2820, y: 150, w: 180, h: 90 },
  ],
} as const

export function getDJWorldFeatures(id: DJChapterId): readonly DJWorldFeature[] {
  return DJ_WORLD_FEATURES[id]
}

export function getFeatureRect(feature: DJWorldFeature, time: number): Rect {
  if (feature.kind !== 'surf-hazard') return { x: feature.x, y: feature.y, w: feature.w, h: feature.h }
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  return {
    x: feature.x + Math.sin(safeTime * feature.speed) * feature.patrol,
    y: feature.y,
    w: feature.w,
    h: feature.h,
  }
}

export function hitsDJSurf(h: Rect, feature: DJWorldFeature, time: number): boolean {
  return feature.kind === 'surf-hazard' && intersects(h, getFeatureRect(feature, time))
}

export function hitsDJRecordCrate(h: Rect, feature: DJWorldFeature): boolean {
  return feature.kind === 'record-crate' && intersects(h, feature)
}

/** The player must cross the top of a pad while descending from above. */
export function canLaunchDJHero(
  h: Rect,
  previousBottom: number,
  vy: number,
  feature: DJWorldFeature,
): boolean {
  if (feature.kind !== 'launch-pad') return false
  if (![previousBottom, vy, h.x, h.y, h.w, h.h].every(Number.isFinite)) return false
  return vy >= 0 &&
    previousBottom <= feature.y + 9 &&
    h.y + h.h >= feature.y - 1 &&
    h.x + h.w > feature.x + 4 &&
    h.x < feature.x + feature.w - 4
}
