export const DJ_WORLD_WIDTH = 3220
export const DJ_VIEW_WIDTH = 820
export const DJ_VIEW_HEIGHT = 420
export const DJ_GRAVITY = 1320
export const DJ_RUN_SPEED = 240
export const DJ_JUMP_SPEED = -555
export const DJ_RECORDS_NEEDED = 9

export interface Rect { x: number; y: number; w: number; h: number }
export interface RecordPickup { x: number; y: number }
export interface ClubEnemy extends Rect { name: 'bouncer' | 'speaker' | 'disco-ghost'; patrol: number; speed: number }

export const DJ_PLATFORMS: Rect[] = [
  { x: 0, y: 365, w: 820, h: 55 },
  { x: 900, y: 365, w: 610, h: 55 },
  { x: 1600, y: 365, w: 630, h: 55 },
  { x: 2310, y: 365, w: 910, h: 55 },
  { x: 250, y: 290, w: 175, h: 16 },
  { x: 535, y: 234, w: 170, h: 16 },
  { x: 815, y: 300, w: 160, h: 16 },
  { x: 1065, y: 267, w: 190, h: 16 },
  { x: 1300, y: 247, w: 148, h: 16 },
  { x: 1515, y: 283, w: 175, h: 16 },
  { x: 1805, y: 264, w: 172, h: 16 },
  { x: 2095, y: 225, w: 170, h: 16 },
  { x: 2350, y: 298, w: 165, h: 16 },
  { x: 2610, y: 262, w: 175, h: 16 },
]
export const DJ_RECORDS: RecordPickup[] = [
  { x: 135, y: 325 }, { x: 328, y: 257 }, { x: 490, y: 327 },
  { x: 610, y: 195 }, { x: 879, y: 264 }, { x: 1140, y: 229 },
  { x: 1355, y: 208 }, { x: 1567, y: 248 }, { x: 1815, y: 329 },
  { x: 1890, y: 227 }, { x: 2160, y: 185 }, { x: 2420, y: 259 },
  { x: 2657, y: 225 }, { x: 2790, y: 330 }, { x: 2990, y: 328 },
]
export const DJ_ENEMIES: ClubEnemy[] = [
  { x: 450, y: 331, w: 30, h: 34, name: 'bouncer', patrol: 70, speed: 1.7 },
  { x: 1075, y: 332, w: 32, h: 33, name: 'speaker', patrol: 65, speed: 1.45 },
  { x: 1370, y: 211, w: 27, h: 36, name: 'disco-ghost', patrol: 40, speed: 2 },
  { x: 1740, y: 331, w: 30, h: 34, name: 'bouncer', patrol: 60, speed: 2.2 },
  { x: 2109, y: 191, w: 30, h: 34, name: 'speaker', patrol: 36, speed: 1.8 },
  { x: 2520, y: 331, w: 27, h: 34, name: 'disco-ghost', patrol: 80, speed: 1.6 },
  { x: 2890, y: 331, w: 30, h: 34, name: 'bouncer', patrol: 64, speed: 1.9 },
]

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
export function getCheckpoint(x: number): number {
  if (x > 2290) return 2330
  if (x > 1570) return 1630
  if (x > 890) return 935
  return 50
}
export function portalOpen(collected: number): boolean {
  return collected >= DJ_RECORDS_NEEDED
}
