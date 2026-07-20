/** Viewport transform helpers — canvas buffer follows the CSS viewport, not world size. */

export interface Point {
  x: number
  y: number
}

export interface ViewportSize {
  cssWidth: number
  cssHeight: number
  dpr: number
}

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 8

export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(max, Math.max(min, zoom))
}

export function resizeViewportCanvas({
  canvas,
  cssWidth,
  cssHeight,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
}: {
  canvas: HTMLCanvasElement
  cssWidth: number
  cssHeight: number
  dpr?: number
}): ViewportSize {
  const safeWidth = Math.max(1, Math.floor(cssWidth))
  const safeHeight = Math.max(1, Math.floor(cssHeight))
  const safeDpr = Math.max(1, dpr)

  canvas.style.width = `${safeWidth}px`
  canvas.style.height = `${safeHeight}px`
  canvas.width = Math.floor(safeWidth * safeDpr)
  canvas.height = Math.floor(safeHeight * safeDpr)

  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(safeDpr, 0, 0, safeDpr, 0, 0)

  return { cssWidth: safeWidth, cssHeight: safeHeight, dpr: safeDpr }
}

/**
 * Convert pointer client coords to world map units.
 * Uses CSS bounding rect + pan/zoom only — never canvas.width/height —
 * so CSS stretch cannot desync cursor from selection.
 */
export function screenToWorld({
  clientX,
  clientY,
  canvasRect,
  pan,
  zoom,
}: {
  clientX: number
  clientY: number
  canvasRect: Pick<DOMRect, 'left' | 'top'>
  pan: Point
  zoom: number
}): Point {
  const safeZoom = zoom === 0 || !Number.isFinite(zoom) ? 1 : zoom
  return {
    x: (clientX - canvasRect.left - pan.x) / safeZoom,
    y: (clientY - canvasRect.top - pan.y) / safeZoom,
  }
}

export function worldToScreen({
  worldX,
  worldY,
  pan,
  zoom,
}: {
  worldX: number
  worldY: number
  pan: Point
  zoom: number
}): Point {
  return {
    x: worldX * zoom + pan.x,
    y: worldY * zoom + pan.y,
  }
}

export function zoomAtPoint({
  currentZoom,
  nextZoom,
  pan,
  screenX,
  screenY,
}: {
  currentZoom: number
  nextZoom: number
  pan: Point
  screenX: number
  screenY: number
}): { zoom: number; pan: Point } {
  const zoom = clampZoom(nextZoom)
  const ratio = zoom / (currentZoom === 0 || !Number.isFinite(currentZoom) ? 1 : currentZoom)
  return {
    zoom,
    pan: {
      x: screenX - (screenX - pan.x) * ratio,
      y: screenY - (screenY - pan.y) * ratio,
    },
  }
}

export function fitWorldToViewport({
  worldWidth,
  worldHeight,
  cssWidth,
  cssHeight,
  padding = 40,
  maxZoom = MAX_ZOOM,
}: {
  worldWidth: number
  worldHeight: number
  cssWidth: number
  cssHeight: number
  padding?: number
  maxZoom?: number
}): { zoom: number; pan: Point } {
  const usableW = Math.max(1, cssWidth - padding * 2)
  const usableH = Math.max(1, cssHeight - padding * 2)
  const w = Math.max(1, worldWidth)
  const h = Math.max(1, worldHeight)
  const zoom = clampZoom(Math.min(usableW / w, usableH / h, maxZoom))
  return {
    zoom,
    pan: {
      x: (cssWidth - w * zoom) / 2,
      y: (cssHeight - h * zoom) / 2,
    },
  }
}

export function getVisibleWorldBounds({
  cssWidth,
  cssHeight,
  pan,
  zoom,
  worldWidth,
  worldHeight,
  pad = 0,
}: {
  cssWidth: number
  cssHeight: number
  pan: Point
  zoom: number
  worldWidth: number
  worldHeight: number
  pad?: number
}): { x: number; y: number; width: number; height: number } {
  const safeZoom = zoom === 0 || !Number.isFinite(zoom) ? 1 : zoom
  const x = -pan.x / safeZoom - pad
  const y = -pan.y / safeZoom - pad
  const width = cssWidth / safeZoom + pad * 2
  const height = cssHeight / safeZoom + pad * 2
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(worldWidth, width),
    height: Math.min(worldHeight, height),
  }
}

export function rectIntersectsBounds(
  rect: { x: number; y: number; width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    rect.x < bounds.x + bounds.width &&
    rect.x + rect.width > bounds.x &&
    rect.y < bounds.y + bounds.height &&
    rect.y + rect.height > bounds.y
  )
}

/** Adaptive major/minor grid step in world units based on zoom. */
export function getAdaptiveGridStep({
  baseGridSize,
  zoom,
}: {
  baseGridSize: number
  zoom: number
}): { minor: number; major: number; drawMinor: boolean } {
  const base = Math.max(1, baseGridSize)
  const screenMinor = base * zoom
  let minor = base
  if (screenMinor < 6) minor = base * Math.ceil(8 / Math.max(screenMinor, 0.001))
  if (screenMinor > 48) minor = Math.max(base, Math.round(base / Math.ceil(screenMinor / 32)))
  const major = minor * 5
  return { minor, major, drawMinor: minor * zoom >= 6 }
}

export function pickScaleBarWorldLength({
  zoom,
  scale,
  targetScreenPx = 96,
}: {
  zoom: number
  scale: number
  targetScreenPx?: number
}): number {
  const worldUnits = targetScreenPx / Math.max(zoom, 0.0001)
  const ground = worldUnits * Math.max(scale, 0.0001)
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2640, 5280]
  let best = nice[0]
  for (const candidate of nice) {
    if (candidate <= ground * 1.35) best = candidate
  }
  return best / Math.max(scale, 0.0001)
}
