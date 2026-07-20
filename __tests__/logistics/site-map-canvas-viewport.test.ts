import { describe, expect, it } from 'vitest'
import {
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  fitWorldToViewport,
  clampZoom,
  getAdaptiveGridStep,
  pickScaleBarWorldLength,
  MIN_ZOOM,
  MAX_ZOOM,
} from '@/components/admin/logistics/site-map-builder/canvas-viewport'
import { screenToMapCoords } from '@/components/admin/logistics/site-map-builder/canvas-coords'
import {
  assertGroundSizeWithinLimit,
  formatGroundSizeLabel,
  getGroundSize,
  isGroundSizeWithinLimit,
  presetToWorldSize,
  FEET_PER_MILE,
  METERS_PER_MILE,
} from '@/lib/site-map/ground-size'

describe('site map canvas viewport', () => {
  it('maps screen to world using CSS rect only (ignores buffer stretch)', () => {
    // Simulated CSS rect smaller than a 2000×1500 buffer — classic stretch bug case
    const canvasRect = { left: 100, top: 50, width: 400, height: 300 } as DOMRect
    const pan = { x: 20, y: 10 }
    const zoom = 2

    const world = screenToWorld({
      clientX: 100 + 20 + 40,
      clientY: 50 + 10 + 60,
      canvasRect,
      pan,
      zoom,
    })

    expect(world).toEqual({ x: 20, y: 30 })
    expect(screenToMapCoords(160, 120, canvasRect, pan, zoom)).toEqual(world)
  })

  it('round-trips worldToScreen and screenToWorld', () => {
    const pan = { x: 40, y: -12 }
    const zoom = 1.5
    const screen = worldToScreen({ worldX: 200, worldY: 80, pan, zoom })
    const back = screenToWorld({
      clientX: screen.x + 10,
      clientY: screen.y + 20,
      canvasRect: { left: 10, top: 20 },
      pan,
      zoom,
    })
    expect(back.x).toBeCloseTo(200)
    expect(back.y).toBeCloseTo(80)
  })

  it('zooms toward a screen point without drifting the focus', () => {
    const pan = { x: 100, y: 50 }
    const result = zoomAtPoint({
      currentZoom: 1,
      nextZoom: 2,
      pan,
      screenX: 200,
      screenY: 150,
    })
    expect(result.zoom).toBe(2)
    // World point under (200,150) stays under that screen point
    const before = screenToWorld({
      clientX: 200,
      clientY: 150,
      canvasRect: { left: 0, top: 0 },
      pan,
      zoom: 1,
    })
    const after = screenToWorld({
      clientX: 200,
      clientY: 150,
      canvasRect: { left: 0, top: 0 },
      pan: result.pan,
      zoom: result.zoom,
    })
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('fits a large world into the viewport', () => {
    const { zoom, pan } = fitWorldToViewport({
      worldWidth: 5280,
      worldHeight: 5280,
      cssWidth: 800,
      cssHeight: 600,
      padding: 40,
    })
    expect(zoom).toBeLessThan(1)
    expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM)
    expect(pan.x).toBeGreaterThan(0)
    expect(pan.y).toBeGreaterThan(0)
  })

  it('clamps zoom to supported range', () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM)
    expect(clampZoom(99)).toBe(MAX_ZOOM)
  })

  it('adapts grid step when zoomed far out', () => {
    const far = getAdaptiveGridStep({ baseGridSize: 20, zoom: 0.05 })
    expect(far.minor).toBeGreaterThan(20)
    // Coarsened step keeps on-screen spacing readable
    expect(far.minor * 0.05).toBeGreaterThanOrEqual(6)
    const near = getAdaptiveGridStep({ baseGridSize: 20, zoom: 2 })
    expect(near.drawMinor).toBe(true)
    expect(near.minor).toBeLessThanOrEqual(20)
  })

  it('picks a readable scale-bar length', () => {
    const worldLen = pickScaleBarWorldLength({ zoom: 1, scale: 1, targetScreenPx: 96 })
    expect(worldLen).toBeGreaterThan(0)
  })
})

describe('site map ground size', () => {
  it('computes ground size from width/scale', () => {
    const ground = getGroundSize({ width: 1320, height: 1320, scale: 1, scaleUnit: 'feet' })
    expect(ground.width).toBe(1320)
    expect(ground.widthMiles).toBeCloseTo(0.25)
  })

  it('allows max 1×1 mile and rejects larger', () => {
    expect(
      isGroundSizeWithinLimit({
        width: FEET_PER_MILE,
        height: FEET_PER_MILE,
        scale: 1,
        scaleUnit: 'feet',
      })
    ).toBe(true)

    expect(
      assertGroundSizeWithinLimit({
        width: FEET_PER_MILE + 1,
        height: 100,
        scale: 1,
        scaleUnit: 'feet',
      }).ok
    ).toBe(false)

    expect(
      isGroundSizeWithinLimit({
        width: METERS_PER_MILE,
        height: METERS_PER_MILE,
        scale: 1,
        scaleUnit: 'meters',
      })
    ).toBe(true)
  })

  it('builds world size from presets including max site', () => {
    const max = presetToWorldSize({ presetId: 'max', scaleUnit: 'feet' })
    expect(max.width).toBe(FEET_PER_MILE)
    expect(max.height).toBe(FEET_PER_MILE)
    expect(max.scale).toBe(1)

    const festival = presetToWorldSize({ presetId: 'festival', scaleUnit: 'feet' })
    expect(festival.width).toBe(1320)
    expect(formatGroundSizeLabel(festival)).toContain('mi')
  })
})
