/**
 * P20-T02 — Time Machine era filter.
 *
 * Coarse, evidence-respecting eras. A filter narrows which content is
 * visible; it NEVER rewrites canonical facts or invents precise dates where
 * evidence is coarse. Content declares its own temporal coverage and the
 * filter matches inclusively against declared ranges.
 */

export const TIME_MACHINE_ERAS = [
  "pre-1900",
  "1900s-1920s",
  "1930s-1940s",
  "1950s-1960s",
  "1970s-1980s",
  "1990s-2000s",
  "2010s-now",
] as const

export type TimeMachineEra = (typeof TIME_MACHINE_ERAS)[number]

export interface EraBounds {
  fromYear: number | null
  toYear: number | null
}

const ERA_BOUNDS: Readonly<Record<TimeMachineEra, EraBounds>> = Object.freeze({
  "pre-1900": { fromYear: null, toYear: 1899 },
  "1900s-1920s": { fromYear: 1900, toYear: 1929 },
  "1930s-1940s": { fromYear: 1930, toYear: 1949 },
  "1950s-1960s": { fromYear: 1950, toYear: 1969 },
  "1970s-1980s": { fromYear: 1970, toYear: 1989 },
  "1990s-2000s": { fromYear: 1990, toYear: 2009 },
  "2010s-now": { fromYear: 2010, toYear: null },
})

/** Bounds for an era (null = open-ended). */
export function boundsForEra(era: TimeMachineEra): EraBounds {
  return ERA_BOUNDS[era]
}

/** True when the item's coverage overlaps the era window (inclusive). */
export function itemMatchesEra(
  item: { startYear?: number | null; endYear?: number | null; era?: string | null },
  target: TimeMachineEra,
): boolean {
  const bounds = ERA_BOUNDS[target]
  // Coarse-era strings can match by containment keyword only when present.
  if ((!item.startYear && item.startYear !== 0) || Number.isNaN(item.startYear)) {
    if (item.era?.trim()) {
      return normalizeEraText(item.era) === normalizeEraText(target) || coarseOverlap(item.era, target)
    }
    return false // undated content never pretends to fit an era
  }
  const start = item.startYear
  const end = item.endYear ?? item.startYear
  const from = bounds.fromYear ?? -Infinity
  const to = bounds.toYear ?? Infinity
  return start <= to && end >= from
}

function normalizeEraText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-")
}

function coarseOverlap(eraText: string, target: TimeMachineEra): boolean {
  const normalized = normalizeEraText(eraText)
  return normalized.includes(normalizeEraText(target)) || normalizeEraText(target).includes(normalized.split("-")[0])
}
