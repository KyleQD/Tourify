/** Real-world ground dimensions for site maps (max 1 mile per axis). */

export type ScaleUnit = 'feet' | 'meters'

export const FEET_PER_MILE = 5280
export const METERS_PER_MILE = 1609.344

export interface GroundSizeInput {
  width: number
  height: number
  scale: number
  scaleUnit?: string | null
}

export interface GroundSize {
  width: number
  height: number
  unit: ScaleUnit
  widthMiles: number
  heightMiles: number
}

export interface GroundPreset {
  id: string
  label: string
  hint: string
  /** Ground extent in feet (converted when unit is meters). */
  groundWidthFt: number
  groundHeightFt: number
}

export const GROUND_SIZE_PRESETS: Record<string, GroundPreset> = {
  stage: {
    id: 'stage',
    label: 'Stage',
    hint: '100×80 ft',
    groundWidthFt: 100,
    groundHeightFt: 80,
  },
  parking: {
    id: 'parking',
    label: 'Parking lot',
    hint: '400×300 ft',
    groundWidthFt: 400,
    groundHeightFt: 300,
  },
  festival: {
    id: 'festival',
    label: 'Festival field',
    hint: '0.25×0.25 mi',
    groundWidthFt: 1320,
    groundHeightFt: 1320,
  },
  campus: {
    id: 'campus',
    label: 'Campus',
    hint: '0.5×0.5 mi',
    groundWidthFt: 2640,
    groundHeightFt: 2640,
  },
  max: {
    id: 'max',
    label: 'Max site',
    hint: '1×1 mi',
    groundWidthFt: FEET_PER_MILE,
    groundHeightFt: FEET_PER_MILE,
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    hint: 'Enter size',
    groundWidthFt: 500,
    groundHeightFt: 400,
  },
}

export function normalizeScaleUnit(unit?: string | null): ScaleUnit {
  return unit === 'feet' || unit === 'ft' ? 'feet' : 'meters'
}

export function maxGroundPerAxis(unit: ScaleUnit): number {
  return unit === 'feet' ? FEET_PER_MILE : METERS_PER_MILE
}

export function feetToUnit(feet: number, unit: ScaleUnit): number {
  if (unit === 'feet') return feet
  return feet * (METERS_PER_MILE / FEET_PER_MILE)
}

export function unitToFeet(value: number, unit: ScaleUnit): number {
  if (unit === 'feet') return value
  return value * (FEET_PER_MILE / METERS_PER_MILE)
}

export function getGroundSize({ width, height, scale, scaleUnit }: GroundSizeInput): GroundSize {
  const unit = normalizeScaleUnit(scaleUnit)
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const safeW = Number.isFinite(width) ? width : 0
  const safeH = Number.isFinite(height) ? height : 0
  const groundW = safeW * safeScale
  const groundH = safeH * safeScale
  const perMile = maxGroundPerAxis(unit)
  return {
    width: groundW,
    height: groundH,
    unit,
    widthMiles: groundW / perMile,
    heightMiles: groundH / perMile,
  }
}

export function isGroundSizeWithinLimit(input: GroundSizeInput): boolean {
  const ground = getGroundSize(input)
  const max = maxGroundPerAxis(ground.unit)
  return ground.width <= max + 1e-6 && ground.height <= max + 1e-6
}

export function assertGroundSizeWithinLimit(input: GroundSizeInput): { ok: true } | { ok: false; error: string } {
  if (isGroundSizeWithinLimit(input)) return { ok: true }
  const unit = normalizeScaleUnit(input.scaleUnit)
  const max = maxGroundPerAxis(unit)
  return {
    ok: false,
    error: `Site map ground size cannot exceed 1 mile × 1 mile (${max} ${unit} per axis)`,
  }
}

/**
 * Build map world dimensions from a physical ground size.
 * Default resolution: 1 map unit = 1 ground unit (scale = 1).
 */
export function worldSizeFromGround({
  groundWidth,
  groundHeight,
  scaleUnit,
  scale = 1,
}: {
  groundWidth: number
  groundHeight: number
  scaleUnit: ScaleUnit
  scale?: number
}): { width: number; height: number; scale: number; scaleUnit: ScaleUnit } {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const width = Math.max(1, Math.round(groundWidth / safeScale))
  const height = Math.max(1, Math.round(groundHeight / safeScale))
  const check = assertGroundSizeWithinLimit({ width, height, scale: safeScale, scaleUnit })
  if (!check.ok) throw new Error(check.error)
  return { width, height, scale: safeScale, scaleUnit }
}

export function presetToWorldSize({
  presetId,
  scaleUnit,
  customGroundWidth,
  customGroundHeight,
  scale = 1,
}: {
  presetId: string
  scaleUnit: ScaleUnit
  customGroundWidth?: number
  customGroundHeight?: number
  scale?: number
}): { width: number; height: number; scale: number; scaleUnit: ScaleUnit } {
  const preset = GROUND_SIZE_PRESETS[presetId] || GROUND_SIZE_PRESETS.parking
  const unit = normalizeScaleUnit(scaleUnit)
  let groundW: number
  let groundH: number
  if (presetId === 'custom') {
    groundW = customGroundWidth ?? feetToUnit(preset.groundWidthFt, unit)
    groundH = customGroundHeight ?? feetToUnit(preset.groundHeightFt, unit)
  } else {
    groundW = feetToUnit(preset.groundWidthFt, unit)
    groundH = feetToUnit(preset.groundHeightFt, unit)
  }
  return worldSizeFromGround({ groundWidth: groundW, groundHeight: groundH, scaleUnit: unit, scale })
}

export function formatGroundSizeLabel(input: GroundSizeInput): string {
  const ground = getGroundSize(input)
  const fmt = (n: number) =>
    n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (ground.widthMiles >= 0.2 || ground.heightMiles >= 0.2) {
    return `${ground.widthMiles.toFixed(2)}×${ground.heightMiles.toFixed(2)} mi`
  }
  return `${fmt(ground.width)}×${fmt(ground.height)} ${ground.unit}`
}
