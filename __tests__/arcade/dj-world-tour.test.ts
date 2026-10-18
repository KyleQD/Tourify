import { describe, expect, it } from 'vitest'
import { DJ_JUMP_SPEED, DJ_GRAVITY, DJ_RECORDS_NEEDED, DJ_WORLD_WIDTH } from '@/lib/arcade/dj-quest-level'
import {
  DJ_CHAPTERS, DJ_CHAPTER_WORLDS, getDJChapter, getDJChapterCheckpoint,
  getDJChapterDistrictLabel, buildDJChapterWorld,
} from '@/lib/arcade/dj-world-tour'

describe('DJ Odyssey world tour destinations', () => {
  it('contains six playable, distinct club destinations', () => {
    expect(DJ_CHAPTERS.map(chapter => chapter.id)).toEqual([
      'studio54', 'whisky', 'amnesia', 'eos', 'fabric', 'tresor',
    ])
    expect(new Set(DJ_CHAPTERS.map(chapter => chapter.id)).size).toBe(6)
    expect(new Set(DJ_CHAPTERS.map(chapter => chapter.backdrop[0])).size).toBe(6)
    expect(DJ_CHAPTERS.every(c => c.name && c.city && c.country && c.gateName)).toBe(true)
    expect(getDJChapter('does-not-exist').id).toBe('studio54')
  })

  it('makes the Amnesia island chapter recognizable with multiple island landmarks', () => {
    const ibiza = getDJChapter('amnesia')
    expect(ibiza.city).toBe('Ibiza')
    expect(ibiza.scenery.map(s => s.name)).toEqual(expect.arrayContaining([
      'Es Vedrà', 'Dalt Vila', 'Ses Salines', 'Turquoise cove',
    ]))
    expect(ibiza.scenery.some(s => s.kind === 'islet')).toBe(true)
    expect(ibiza.scenery.some(s => s.kind === 'old-town')).toBe(true)
    expect(getDJChapterDistrictLabel(ibiza, 880)).toBe('Es Vedrà')
  })

  it('adds an original Santa Barbara coastal chapter with its actual cultural landmarks', () => {
    const santaBarbara = getDJChapter('eos')
    expect(santaBarbara.city).toBe('Santa Barbara')
    expect(santaBarbara.name).toBe('EOS Lounge')
    expect(santaBarbara.gateName).toBe('EOS')
    expect(santaBarbara.scenery.map(stop => stop.name)).toEqual(expect.arrayContaining([
      'Stearns Wharf', 'State Street', 'Courthouse Tower', 'The Funk Zone',
    ]))
    expect(santaBarbara.scenery.map(stop => stop.kind)).toEqual(expect.arrayContaining([
      'wharf', 'red-roofs', 'courthouse', 'patio', 'coast',
    ]))
    expect(santaBarbara.scenery.every(stop => stop.x > 0 && stop.x < DJ_WORLD_WIDTH)).toBe(true)
    expect(santaBarbara.scenery.every((stop, index, all) => index === 0 || stop.x > all[index - 1].x)).toBe(true)
    expect(getDJChapterDistrictLabel(santaBarbara, 1400)).toBe('State Street')
    expect(getDJChapterDistrictLabel(santaBarbara, 3000)).toBe('Patio Encore')
  })

  it('preserves platform physics and keeps gaps within jump travel distance', () => {
    const jumpTravel = 2 * Math.abs(DJ_JUMP_SPEED) / DJ_GRAVITY * 240
    for (const chapter of DJ_CHAPTERS) {
      const world = DJ_CHAPTER_WORLDS[chapter.id]
      const reconstructed = buildDJChapterWorld(chapter)
      expect(world).toEqual(reconstructed)
      expect(world.platforms.length).toBeGreaterThanOrEqual(11)
      expect(world.records.length).toBeGreaterThanOrEqual(DJ_RECORDS_NEEDED)
      expect(world.enemies.length).toBeGreaterThanOrEqual(5)
      expect(world.records.every(r => r.x > 0 && r.x < DJ_WORLD_WIDTH)).toBe(true)
      expect(chapter.ground[0].x).toBe(0)
      expect(chapter.ground.at(-1)!.x + chapter.ground.at(-1)!.w).toBe(DJ_WORLD_WIDTH)
      for (let i = 1; i < chapter.ground.length; i++) {
        const gap = chapter.ground[i].x - (chapter.ground[i - 1].x + chapter.ground[i - 1].w)
        expect(gap).toBeGreaterThan(0)
        expect(gap).toBeLessThan(jumpTravel - 32)
      }
    }
  })

  it('respawns on ground within the matching chapter (not the old map)', () => {
    for (const chapter of DJ_CHAPTERS) {
      expect(getDJChapterCheckpoint(chapter, 54)).toBe(54)
      const second = chapter.ground[1]
      expect(getDJChapterCheckpoint(chapter, second.x + 200)).toBe(second.x + 32)
      const final = chapter.ground.at(-1)!
      expect(getDJChapterCheckpoint(chapter, DJ_WORLD_WIDTH - 170)).toBe(final.x + 32)
    }
  })

  it('keeps original Studio 54 landmark labels as the retro first chapter', () => {
    const chapter = getDJChapter('studio54')
    expect(getDJChapterDistrictLabel(chapter, 0)).toBe('Record Row')
    expect(getDJChapterDistrictLabel(chapter, 1600)).toBe('Subway Beats')
    expect(getDJChapterDistrictLabel(chapter, 2700)).toBe('Disco Mile')
  })
})
