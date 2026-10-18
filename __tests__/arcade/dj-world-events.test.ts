import { describe, expect, it } from 'vitest'
import { DJ_CHAPTERS, getDJChapter } from '@/lib/arcade/dj-world-tour'
import { DJ_WORLD_FEATURES, canLaunchDJHero, getDJWorldFeatures, getFeatureRect, hitsDJRecordCrate, hitsDJSurf } from '@/lib/arcade/dj-world-events'

describe('DJ Odyssey EOS location mechanics', () => {
  const features = DJ_WORLD_FEATURES.eos
  const launch = features.find(f => f.kind === 'launch-pad')!
  const surf = features.find(f => f.kind === 'surf-hazard')!
  const crate = features.find(f => f.kind === 'record-crate')!

  it('isolates the pier, beach, record-store and patio encounters to EOS', () => {
    expect(features.map(feature => feature.kind)).toEqual([
      'launch-pad', 'surf-hazard', 'record-crate', 'patio-lights',
    ])
    expect(new Set(features.map(feature => feature.id)).size).toBe(features.length)
    expect(features.every(feature => feature.x > 0 && feature.x + feature.w < 3220)).toBe(true)
    for (const chapter of DJ_CHAPTERS.filter(c => c.id !== 'eos')) {
      expect(getDJWorldFeatures(chapter.id)).toEqual([])
    }
    expect(getDJChapter('eos').scenery.length).toBe(6)
  })

  it('launches only on a downward landing across the top of the wharf pad', () => {
    expect(canLaunchDJHero({ x: 325, y: launch.y - 39, w: 28, h: 39 }, launch.y - 1, 0, launch)).toBe(true)
    expect(canLaunchDJHero({ x: 325, y: launch.y - 39, w: 28, h: 39 }, launch.y - 1, -200, launch)).toBe(false)
    expect(canLaunchDJHero({ x: 120, y: launch.y - 39, w: 28, h: 39 }, launch.y - 1, 0, launch)).toBe(false)
    expect(canLaunchDJHero({ x: 325, y: launch.y + 20, w: 28, h: 39 }, launch.y + 20, 0, launch)).toBe(false)
  })

  it('moves surf predictably and applies damage only on physical intersection', () => {
    const a = getFeatureRect(surf, 0)
    const b = getFeatureRect(surf, Math.PI / 2 / (surf.kind === 'surf-hazard' ? surf.speed : 1))
    expect(a.x).toBe(surf.x)
    expect(b.x).toBeGreaterThan(a.x)
    expect(hitsDJSurf({ x: a.x + 5, y: 334, w: 22, h: 31 }, surf, 0)).toBe(true)
    expect(hitsDJSurf({ x: 80, y: 334, w: 28, h: 31 }, surf, 0)).toBe(false)
    expect(hitsDJSurf({ x: a.x + 5, y: 220, w: 22, h: 31 }, surf, 0)).toBe(false)
  })

  it('keeps bonus vinyl physically collectible once per run via caller-side tracking', () => {
    expect(hitsDJRecordCrate({ x: crate.x, y: 323, w: 28, h: 39 }, crate)).toBe(true)
    expect(hitsDJRecordCrate({ x: 50, y: 323, w: 28, h: 39 }, crate)).toBe(false)
    expect(crate.kind === 'record-crate' && crate.points).toBe(500)
    // There is exactly one crate ID; the game stores collected IDs in a Set.
    expect(features.filter(f => f.kind === 'record-crate')).toHaveLength(1)
  })
})
