/**
 * P19-T08 — non-geographic tube-map contract for educational views.
 *
 * Translates directional transmission edges into lines/stations that can be
 * drawn as a transit map: one LINE per subtype, stations ordered by era.
 * Pure and deterministic — no geography, no rendering assumptions.
 */
import type { TransmissionEdge } from "./graph"

export interface TubeStation {
  placeKey: string
  /** Position along the line (chronological). */
  order: number
  firstYear: number | null
}

export interface TubeLine {
  key: string
  label: string
  stations: TubeStation[]
}

export interface TubeMap {
  lines: TubeLine[]
  /** Interchange points where the same place appears on multiple lines. */
  interchanges: string[]
}

const LINE_LABELS: Record<string, string> = {
  migration_diaspora: "Migration & Diaspora",
  touring_exchange: "Touring Exchange",
  radio_broadcast: "Radio Waves",
  technology_transfer: "Technology Transfer",
  scene_influence: "Scene Influence",
  genre_evolution: "Genre Evolution",
}

/** Build the tube-map view. Same edges ⇒ same map. */
export function edgesToTubeMap(validatedEdges: readonly TransmissionEdge[]): TubeMap {
  const bySubtype = new Map<string, Map<string, { order: number; year: number | null }>>()
  const appearanceCount = new Map<string, number>()

  for (const edge of validatedEdges) {
    if (edge.reviewStatus === "rejected") continue
    let line = bySubtype.get(edge.subtype)
    if (!line) {
      line = new Map()
      bySubtype.set(edge.subtype, line)
    }
    for (const [index, place] of [edge.fromPlaceKey, edge.toPlaceKey].entries()) {
      const existing = line.get(place)
      const year = index === 0 ? (edge.startYear ?? null) : existing?.year ?? null
      if (!existing) {
        line.set(place, { order: Number.MAX_SAFE_INTEGER, year })
      }
    }
    appearanceCount.set(edge.fromPlaceKey, (appearanceCount.get(edge.fromPlaceKey) ?? 0))
    appearanceCount.set(edge.toPlaceKey, (appearanceCount.get(edge.toPlaceKey) ?? 0))
  }

  // Order stations chronologically within each line (unknown years sink).
  const lines: TubeLine[] = [...bySubtype.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, stations]) => {
      const ordered = [...stations.entries()]
        .map(([placeKey, meta]) => ({ placeKey, year: meta.year }))
        .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.placeKey.localeCompare(b.placeKey))
        .map((s, index) => ({ placeKey: s.placeKey, order: index, firstYear: s.year }))
      return { key, label: LINE_LABELS[key] ?? key, stations: ordered }
    })

  // Count distinct lines per place for interchanges.
  const placeLineCount = new Map<string, Set<string>>()
  for (const line of lines) {
    for (const station of line.stations) {
      const set = placeLineCount.get(station.placeKey) ?? new Set<string>()
      set.add(line.key)
      placeLineCount.set(station.placeKey, set)
    }
  }
  void appearanceCount
  const interchanges = [...placeLineCount.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([place]) => place)
    .sort()

  return { lines, interchanges }
}
