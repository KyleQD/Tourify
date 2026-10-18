import {
  DJ_ENEMIES, DJ_PLATFORMS, DJ_RECORDS, DJ_WORLD_WIDTH,
  type ClubEnemy, type Rect, type RecordPickup,
} from './dj-quest-level'

/**
 * Fictional side-scrolling journeys inspired by real nightlife destinations.
 * Landmarks are compressed and rearranged for play, NOT geographic directions,
 * and no venue artwork, recordings or official endorsement is implied.
 */
export type DJChapterId = 'studio54' | 'whisky' | 'amnesia' | 'fabric' | 'tresor'
export type DJLandmarkKind =
  | 'skyline' | 'billboards' | 'palm' | 'hills' | 'sunset'
  | 'cove' | 'islet' | 'old-town' | 'salt-flats'
  | 'bridge' | 'clocktower' | 'tube'
  | 'tower' | 'wall' | 'warehouse'

export interface DJLandmark {
  x: number
  name: string
  kind: DJLandmarkKind
}

export interface DJChapter {
  id: DJChapterId
  name: string
  city: string
  country: string
  genre: string
  description: string
  tagline: string
  gateName: string
  gateSubtitle: string
  backdrop: readonly [string, string, string]
  accent: string
  scenery: readonly DJLandmark[]
  /** Ground-only layout. Elevated platforms have separate variations. */
  ground: readonly Rect[]
  platformShift: number
  recordShift: number
  enemyShift: number
}

const baseGround: Rect[] = DJ_PLATFORMS.slice(0, 4).map(p => ({ ...p }))

export const DJ_CHAPTERS: readonly DJChapter[] = [
  {
    id: 'studio54', name: 'Studio 54', city: 'New York City', country: 'USA',
    genre: 'Disco', description: 'Race through a neon-soaked club city and collect enough vinyl for the velvet-rope finale.',
    tagline: 'THE ORIGINAL DISCO QUEST', gateName: 'STUDIO', gateSubtitle: '54',
    backdrop: ['#100b2c', '#261340', '#4e205b'], accent: '#f472b6',
    scenery: [
      { x: 180, name: 'Neon avenue', kind: 'billboards' },
      { x: 830, name: 'Midtown skyline', kind: 'skyline' },
      { x: 1770, name: 'Disco district', kind: 'billboards' },
      { x: 2600, name: 'Manhattan at night', kind: 'skyline' },
    ],
    ground: baseGround, platformShift: 0, recordShift: 0, enemyShift: 0,
  },
  {
    id: 'whisky', name: 'Whisky a Go Go', city: 'West Hollywood', country: 'USA',
    genre: 'Sunset Strip rock', description: 'Dash past palm trees, tour posters, rooftop amps and Sunset Strip lights on your way to a rock-club encore.',
    tagline: 'SUNSET STRIP ROCK RUN', gateName: 'WHISKY', gateSubtitle: 'GO GO',
    backdrop: ['#2b1027', '#652647', '#ef743a'], accent: '#fbbf24',
    scenery: [
      { x: 240, name: 'Sunset Boulevard', kind: 'billboards' },
      { x: 760, name: 'LA palms', kind: 'palm' },
      { x: 1480, name: 'Hollywood hills', kind: 'hills' },
      { x: 2170, name: 'Sunset Strip', kind: 'sunset' },
      { x: 2790, name: 'Rock marquee', kind: 'billboards' },
    ],
    ground: [
      { x: 0, y: 365, w: 850, h: 55 }, { x: 935, y: 365, w: 655, h: 55 },
      { x: 1675, y: 365, w: 645, h: 55 }, { x: 2405, y: 365, w: 815, h: 55 },
    ], platformShift: 16, recordShift: 9, enemyShift: 14,
  },
  {
    id: 'amnesia', name: 'Amnesia Ibiza', city: 'Ibiza', country: 'Spain',
    genre: 'Balearic house', description: 'A fantasy trip across turquoise coves, whitewashed old-town rooftops, Es Vedrà and salt flats before the island-club finale.',
    tagline: 'IBIZA ISLAND QUEST', gateName: 'AMNESIA', gateSubtitle: 'IBIZA',
    backdrop: ['#0e4774', '#1c9aab', '#efbd8b'], accent: '#2dd4bf',
    scenery: [
      { x: 200, name: 'Turquoise cove', kind: 'cove' },
      { x: 780, name: 'Es Vedrà', kind: 'islet' },
      { x: 1360, name: 'Dalt Vila', kind: 'old-town' },
      { x: 2030, name: 'Ses Salines', kind: 'salt-flats' },
      { x: 2630, name: 'Island palms', kind: 'palm' },
      { x: 2850, name: 'Road to Sant Rafel', kind: 'hills' },
    ],
    ground: [
      { x: 0, y: 365, w: 790, h: 55 }, { x: 865, y: 365, w: 645, h: 55 },
      { x: 1600, y: 365, w: 625, h: 55 }, { x: 2310, y: 365, w: 910, h: 55 },
    ], platformShift: -12, recordShift: 8, enemyShift: -13,
  },
  {
    id: 'fabric', name: 'fabric London', city: 'London', country: 'UK',
    genre: 'UK garage and drum & bass', description: 'Hop between rainy rooftops, tube platforms and bridge lights on the road to an underground dancefloor.',
    tagline: 'LONDON UNDERGROUND RUN', gateName: 'FABRIC', gateSubtitle: 'LONDON',
    backdrop: ['#111d31', '#33527a', '#577ba2'], accent: '#7dd3fc',
    scenery: [
      { x: 360, name: 'London skyline', kind: 'clocktower' },
      { x: 1050, name: 'River crossing', kind: 'bridge' },
      { x: 1930, name: 'Underground station', kind: 'tube' },
      { x: 2650, name: 'Farringdon lights', kind: 'warehouse' },
    ],
    ground: [
      { x: 0, y: 365, w: 820, h: 55 }, { x: 900, y: 365, w: 560, h: 55 },
      { x: 1545, y: 365, w: 590, h: 55 }, { x: 2220, y: 365, w: 1000, h: 55 },
    ], platformShift: 10, recordShift: -8, enemyShift: 15,
  },
  {
    id: 'tresor', name: 'Tresor Berlin', city: 'Berlin', country: 'Germany',
    genre: 'Industrial techno', description: 'Navigate painted walls, rail stations and towering industrial silhouettes before the vault-door finale.',
    tagline: 'BERLIN TECHNO RUN', gateName: 'TRESOR', gateSubtitle: 'BERLIN',
    backdrop: ['#0c1722', '#283542', '#50525c'], accent: '#c4b5fd',
    scenery: [
      { x: 420, name: 'Berlin TV Tower', kind: 'tower' },
      { x: 1090, name: 'Street art walls', kind: 'wall' },
      { x: 1780, name: 'U-Bahn', kind: 'tube' },
      { x: 2680, name: 'Power station', kind: 'warehouse' },
    ],
    ground: [
      { x: 0, y: 365, w: 800, h: 55 }, { x: 885, y: 365, w: 610, h: 55 },
      { x: 1580, y: 365, w: 645, h: 55 }, { x: 2310, y: 365, w: 910, h: 55 },
    ], platformShift: -8, recordShift: 12, enemyShift: -12,
  },
] as const

export function getDJChapter(id: string): DJChapter {
  return DJ_CHAPTERS.find(chapter => chapter.id === id) || DJ_CHAPTERS[0]
}

export interface DJChapterWorld {
  platforms: Rect[]
  records: RecordPickup[]
  enemies: ClubEnemy[]
}

/**
 * Deterministic layout variations. Original landings remain close enough to
 * the original jump geometry while ground gaps vary by location.
 */
export function buildDJChapterWorld(chapter: DJChapter): DJChapterWorld {
  const platforms = [
    ...chapter.ground.map(p => ({ ...p })),
    ...DJ_PLATFORMS.slice(4).map((p, index) => ({
      ...p,
      x: p.x + (index % 2 ? -1 : 1) * chapter.platformShift,
      y: p.y + (index % 3 === 1 ? Math.round(chapter.platformShift / 3) : 0),
    })),
  ]
  const records = DJ_RECORDS.map((record, index) => ({
    ...record,
    x: record.x + (index % 3 === 0 ? chapter.recordShift : 0),
    y: record.y,
  }))
  const enemies = DJ_ENEMIES.map((enemy, index) => ({
    ...enemy, x: Math.max(0, Math.min(DJ_WORLD_WIDTH - enemy.w, enemy.x + (index % 2 ? -1 : 1) * chapter.enemyShift)),
  }))
  return { platforms, records, enemies }
}

/** Respawn locations follow actual ground segments in each chapter. */
export function getDJChapterCheckpoint(chapter: DJChapter, position: number): number {
  let checkpoint = 54
  if (!Number.isFinite(position)) return checkpoint
  for (const ground of chapter.ground.slice(1)) {
    if (position > ground.x + 28) checkpoint = Math.round(ground.x + 32)
  }
  return checkpoint
}

export function getDJChapterDistrictLabel(chapter: DJChapter, x: number): string {
  if (chapter.id === 'studio54') {
    if (x >= 2200) return 'Disco Mile'
    if (x >= 1020) return 'Subway Beats'
    return 'Record Row'
  }
  const safeX = Number.isFinite(x) ? Math.max(0, x) : 0
  let label = chapter.scenery[0]?.name || chapter.city
  for (const landmark of chapter.scenery) {
    if (safeX >= landmark.x) label = landmark.name
  }
  return label
}

export const DJ_CHAPTER_WORLDS: Record<DJChapterId, DJChapterWorld> =
  Object.fromEntries(DJ_CHAPTERS.map(chapter => [chapter.id, buildDJChapterWorld(chapter)])) as Record<DJChapterId, DJChapterWorld>
