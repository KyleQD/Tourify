export interface Point {
  x: number
  y: number
}

export interface Rect {
  id?: string
  x: number
  y: number
  width: number
  height: number
}

export function getNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function snapToGridPosition(
  x: number,
  y: number,
  { snapToGrid, gridSize }: { snapToGrid: boolean; gridSize: number }
): Point {
  if (!snapToGrid) return { x, y }
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  }
}

export function getGridAlignedDimensions(
  width: number,
  height: number,
  { snapToGrid, gridSize }: { snapToGrid: boolean; gridSize: number }
): { width: number; height: number } {
  if (!snapToGrid) return { width, height }
  return {
    width: Math.max(gridSize, Math.round(width / gridSize) * gridSize),
    height: Math.max(gridSize, Math.round(height / gridSize) * gridSize),
  }
}

export function getOccupiedGridCells(
  x: number,
  y: number,
  width: number,
  height: number,
  gridSize: number
): Point[] {
  const cells: Point[] = []
  const gridX = Math.floor(x / gridSize)
  const gridY = Math.floor(y / gridSize)
  const gridWidth = Math.ceil(width / gridSize)
  const gridHeight = Math.ceil(height / gridSize)

  for (let gy = gridY; gy < gridY + gridHeight; gy++) {
    for (let gx = gridX; gx < gridX + gridWidth; gx++) {
      cells.push({ x: gx * gridSize, y: gy * gridSize })
    }
  }
  return cells
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function checkPlacementValidity(
  rect: Rect,
  {
    mapWidth,
    mapHeight,
    obstacles,
    ignoreIds = [],
  }: {
    mapWidth: number
    mapHeight: number
    obstacles: Rect[]
    ignoreIds?: string[]
  }
): boolean {
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > mapWidth || rect.y + rect.height > mapHeight)
    return false

  return !obstacles.some((obstacle) => {
    if (obstacle.id && ignoreIds.includes(obstacle.id)) return false
    return rectsOverlap(rect, obstacle)
  })
}

/** @deprecated Prefer screenToWorld from canvas-viewport — same CSS-space formula. */
export function screenToMapCoords(
  clientX: number,
  clientY: number,
  canvasRect: Pick<DOMRect, 'left' | 'top'>,
  pan: Point,
  zoom: number
): Point {
  const safeZoom = zoom === 0 || !Number.isFinite(zoom) ? 1 : zoom
  return {
    x: (clientX - canvasRect.left - pan.x) / safeZoom,
    y: (clientY - canvasRect.top - pan.y) / safeZoom,
  }
}

export function hitTestRect<T extends Rect>(items: T[], mx: number, my: number): T | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (mx >= item.x && mx <= item.x + item.width && my >= item.y && my <= item.y + item.height)
      return item
  }
  return null
}

export function normalizeZoneBounds(zone: Record<string, unknown>, index = 0): Rect {
  return {
    x: getNumber(zone.x ?? zone.position_x, 80 + index * 28),
    y: getNumber(zone.y ?? zone.position_y, 80 + index * 28),
    width: getNumber(zone.width ?? zone.width_ft, 220),
    height: getNumber(zone.height ?? zone.depth_ft, 140),
  }
}

export function normalizeTentBounds(tent: Record<string, unknown>, index = 0): Rect {
  return {
    x: getNumber(tent.x ?? tent.position_x, 120 + (index % 5) * 120),
    y: getNumber(tent.y ?? tent.position_y, 140 + Math.floor(index / 5) * 110),
    width: getNumber(tent.width ?? tent.width_ft, 100),
    height: getNumber(tent.height ?? tent.depth_ft, 80),
  }
}

export function computeCenteredPlacement(
  cursor: Point,
  width: number,
  height: number,
  options: { snapToGrid: boolean; gridSize: number }
): Point {
  const snappedCursor = snapToGridPosition(cursor.x, cursor.y, options)
  const dims = getGridAlignedDimensions(width, height, options)
  const centered = {
    x: snappedCursor.x - dims.width / 2,
    y: snappedCursor.y - dims.height / 2,
  }
  return snapToGridPosition(centered.x, centered.y, options)
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function getResizeHandles(rect: Rect, handleSize = 8): Array<{ handle: ResizeHandle } & Rect> {
  const half = handleSize / 2
  return [
    { handle: 'nw', x: rect.x - half, y: rect.y - half, width: handleSize, height: handleSize },
    { handle: 'ne', x: rect.x + rect.width - half, y: rect.y - half, width: handleSize, height: handleSize },
    { handle: 'sw', x: rect.x - half, y: rect.y + rect.height - half, width: handleSize, height: handleSize },
    { handle: 'se', x: rect.x + rect.width - half, y: rect.y + rect.height - half, width: handleSize, height: handleSize },
  ]
}

export function hitTestResizeHandle(rect: Rect, mx: number, my: number, handleSize = 10): ResizeHandle | null {
  for (const handle of getResizeHandles(rect, handleSize)) {
    if (
      mx >= handle.x &&
      mx <= handle.x + handle.width &&
      my >= handle.y &&
      my <= handle.y + handle.height
    )
      return handle.handle
  }
  return null
}

export function applyResize(
  rect: Rect,
  handle: ResizeHandle,
  mx: number,
  my: number,
  minSize = 20
): Rect {
  let { x, y, width, height } = rect
  if (handle.includes('e')) width = Math.max(minSize, mx - x)
  if (handle.includes('s')) height = Math.max(minSize, my - y)
  if (handle.includes('w')) {
    const right = x + width
    x = Math.min(mx, right - minSize)
    width = right - x
  }
  if (handle.includes('n')) {
    const bottom = y + height
    y = Math.min(my, bottom - minSize)
    height = bottom - y
  }
  return { x, y, width, height }
}

export function moveSelectionByDelta<T extends Rect>(
  items: T[],
  selectedIds: Set<string>,
  dx: number,
  dy: number,
  getId: (item: T) => string
): T[] {
  return items.map((item) => {
    if (!selectedIds.has(getId(item))) return item
    return { ...item, x: item.x + dx, y: item.y + dy }
  })
}

export const LIBRARY_DND_TYPE = 'site-map-canned-element'

export interface LibraryDragPayload {
  cannedElementId: string
  width: number
  height: number
  name: string
  color: string
  strokeColor: string
  properties: Record<string, unknown>
}
