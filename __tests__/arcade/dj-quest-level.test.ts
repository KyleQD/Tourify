import { describe, expect, it } from 'vitest'
import {
  DJ_ENEMIES, DJ_PLATFORMS, DJ_RECORDS, DJ_RECORDS_NEEDED, DJ_WORLD_WIDTH,
  getCheckpoint, intersects, portalOpen, calculateDJRunScore,
} from '@/lib/arcade/dj-quest-level'

describe('DJ Odyssey game mechanics', () => {
  it('offers enough records and a reachable goal world', () => {
    expect(DJ_RECORDS.length).toBeGreaterThan(DJ_RECORDS_NEEDED)
    expect(DJ_RECORDS.every(r => r.x > 0 && r.x < DJ_WORLD_WIDTH)).toBe(true)
    expect(DJ_PLATFORMS.some(p => p.x + p.w >= DJ_WORLD_WIDTH)).toBe(true)
    expect(DJ_ENEMIES.map(e => e.name)).toContain('speaker')
    expect(DJ_ENEMIES.map(e => e.name)).toContain('bouncer')
    expect(DJ_ENEMIES.map(e => e.name)).toContain('disco-ghost')
  })
  it('checks portal unlock threshold and tracks safe checkpoints', () => {
    expect(portalOpen(DJ_RECORDS_NEEDED - 1)).toBe(false)
    expect(portalOpen(DJ_RECORDS_NEEDED)).toBe(true)
    expect(getCheckpoint(500)).toBe(50)
    expect(getCheckpoint(1700)).toBe(1630)
    expect(getCheckpoint(2400)).toBe(2330)
  })
  it('detects bounding box contact correctly', () => {
    expect(intersects({ x: 10, y: 10, w: 20, h: 20 }, { x: 25, y: 20, w: 20, h: 10 })).toBe(true)
    expect(intersects({ x: 10, y: 10, w: 20, h: 20 }, { x: 30, y: 20, w: 20, h: 10 })).toBe(false)
  })
  it('calculates finite, bounded local scores and rewards record collection', () => {
    expect(calculateDJRunScore(10, 3, 2, 40)).toBeGreaterThan(calculateDJRunScore(9, 3, 2, 40))
    expect(calculateDJRunScore(10, 3, 2, 40)).toBeGreaterThan(calculateDJRunScore(10, 2, 2, 40))
    expect(calculateDJRunScore(-100, Infinity, NaN, Number.POSITIVE_INFINITY)).toBe(2500)
  })

})
