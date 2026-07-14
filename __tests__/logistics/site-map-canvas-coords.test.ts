import { describe, expect, it } from 'vitest'
import {
  snapToGridPosition,
  getGridAlignedDimensions,
  checkPlacementValidity,
  computeCenteredPlacement,
  applyResize,
  moveSelectionByDelta,
  rectsOverlap,
  hitTestResizeHandle,
} from '@/components/admin/logistics/site-map-builder/canvas-coords'

describe('site map canvas coords', () => {
  it('snaps positions to grid', () => {
    expect(snapToGridPosition(23, 47, { snapToGrid: true, gridSize: 20 })).toEqual({ x: 20, y: 40 })
    expect(snapToGridPosition(23, 47, { snapToGrid: false, gridSize: 20 })).toEqual({ x: 23, y: 47 })
  })

  it('aligns dimensions to grid', () => {
    expect(getGridAlignedDimensions(55, 33, { snapToGrid: true, gridSize: 20 })).toEqual({
      width: 60,
      height: 40,
    })
  })

  it('rejects out-of-bounds and overlapping placements', () => {
    expect(
      checkPlacementValidity(
        { x: -1, y: 0, width: 40, height: 40 },
        { mapWidth: 200, mapHeight: 200, obstacles: [] }
      )
    ).toBe(false)

    expect(
      checkPlacementValidity(
        { x: 10, y: 10, width: 40, height: 40 },
        {
          mapWidth: 200,
          mapHeight: 200,
          obstacles: [{ id: 'a', x: 20, y: 20, width: 40, height: 40 }],
        }
      )
    ).toBe(false)

    expect(
      checkPlacementValidity(
        { x: 10, y: 10, width: 40, height: 40 },
        {
          mapWidth: 200,
          mapHeight: 200,
          obstacles: [{ id: 'a', x: 20, y: 20, width: 40, height: 40 }],
          ignoreIds: ['a'],
        }
      )
    ).toBe(true)
  })

  it('centers placement on cursor with snap', () => {
    const pos = computeCenteredPlacement({ x: 100, y: 100 }, 40, 40, {
      snapToGrid: true,
      gridSize: 20,
    })
    expect(pos).toEqual({ x: 80, y: 80 })
  })

  it('applies resize from handles', () => {
    const base = { x: 20, y: 20, width: 60, height: 40 }
    expect(applyResize(base, 'se', 100, 80)).toEqual({ x: 20, y: 20, width: 80, height: 60 })
    expect(applyResize(base, 'nw', 10, 10).width).toBeGreaterThanOrEqual(20)
  })

  it('moves a multi-selection by delta', () => {
    const items = [
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 20, y: 20, width: 10, height: 10 },
      { id: 'c', x: 40, y: 40, width: 10, height: 10 },
    ]
    const moved = moveSelectionByDelta(items, new Set(['a', 'c']), 5, -5, (item) => item.id)
    expect(moved[0]).toMatchObject({ x: 5, y: -5 })
    expect(moved[1]).toMatchObject({ x: 20, y: 20 })
    expect(moved[2]).toMatchObject({ x: 45, y: 35 })
  })

  it('detects resize handle hits', () => {
    expect(hitTestResizeHandle({ x: 0, y: 0, width: 100, height: 80 }, 0, 0, 10)).toBe('nw')
    expect(hitTestResizeHandle({ x: 0, y: 0, width: 100, height: 80 }, 100, 80, 10)).toBe('se')
    expect(hitTestResizeHandle({ x: 0, y: 0, width: 100, height: 80 }, 50, 40, 10)).toBeNull()
  })

  it('checks rectangle overlap', () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 })).toBe(false)
  })
})
