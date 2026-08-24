/**
 * P13 — Server-side spatial-cell clustering (pure, deterministic).
 *
 * Same input snapshot + same options ⇒ byte-identical output. Points are
 * assigned to a fixed lat/lng grid (cell size from the zoom policy), each
 * cell collapses to one cluster with a deterministic representative, and a
 * per-layer density cap bounds the payload independent of total record
 * count.
 *
 * H3/equivalent is intentionally NOT used: per spec it is evaluated only
 * after PostGIS access patterns are measured (P15+). The grid below is
 * dependency-free and stable; migrating cells later is an internal change.
 */

export interface ClusterablePoint {
  id: string
  lat: number
  lng: number
  /** Higher wins under equal priority class. */
  weight: number
  /** Priority class: curated content outranks derived signal weight. */
  priority?: "curated" | "signal" | "derived"
  kind?: string
}

export interface Cluster {
  /** Stable cell key — deterministic across runs for the same inputs. */
  key: string
  centerLat: number
  centerLng: number
  count: number
  totalWeight: number
  maxWeight: number
  /** Representative point (deterministic: highest priority/weight, then id). */
  representativeId: string
  /** Kind breakdown for children rendering (capped). */
  kinds: Array<{ kind: string; count: number }>
}

const PRIORITY_RANK: Record<string, number> = { curated: 0, signal: 1, derived: 2 }

function priorityValue(point: ClusterablePoint): number {
  return PRIORITY_RANK[point.priority ?? "derived"] ?? 3
}

/**
 * Deterministic ordering used everywhere in this module:
 * priority class → weight desc → id asc. Never depends on input order.
 */
export function comparePoints(a: ClusterablePoint, b: ClusterablePoint): number {
  const p = priorityValue(a) - priorityValue(b)
  if (p !== 0) return p
  if (b.weight !== a.weight) return b.weight - a.weight
  return a.id.localeCompare(b.id)
}

/** Stable cell key for a lat/lng at a given cell size. Wraps lng to [-180,180). */
export function cellKeyFor(lat: number, lng: number, cellSizeDeg: number): string {
  const normLng = ((((lng + 180) % 360) + 360) % 360) - 180
  const x = Math.floor(normLng / cellSizeDeg)
  const y = Math.floor(lat / cellSizeDeg)
  return `${y}:${x}`
}

/**
 * Cluster points into cells. Cell representatives are chosen deterministically;
 * cluster centers are the weighted centroid of members (rounded to 4 decimals).
 * Pole-adjacent and antimeridian points stay stable via normalized lng keys.
 */
export function clusterPoints(
  points: readonly ClusterablePoint[],
  cellSizeDeg: number,
): Cluster[] {
  if (!(cellSizeDeg > 0) || !Number.isFinite(cellSizeDeg)) return []

  const cells = new Map<string, ClusterablePoint[]>()
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue
    if (point.lat < -90 || point.lat > 90) continue
    const key = cellKeyFor(point.lat, point.lng, cellSizeDeg)
    const list = cells.get(key)
    if (list) list.push(point)
    else cells.set(key, [point])
  }

  const clusters: Cluster[] = []
  for (const [key, members] of cells) {
    const sorted = [...members].sort(comparePoints)
    let totalWeight = 0
    let weightLat = 0
    let weightLng = 0
    const kindCounts = new Map<string, number>()
    for (const member of sorted) {
      const w = Number.isFinite(member.weight) ? Math.max(member.weight, 0) : 0
      totalWeight += w
      weightLat += member.lat * w
      weightLng += member.lng * w
      if (member.kind) kindCounts.set(member.kind, (kindCounts.get(member.kind) ?? 0) + 1)
    }
    clusters.push({
      key,
      centerLat: round4(totalWeight > 0 ? weightLat / totalWeight : sorted[0].lat),
      centerLng: round4(totalWeight > 0 ? weightLng / totalWeight : sorted[0].lng),
      count: sorted.length,
      totalWeight: round4(totalWeight),
      maxWeight: round4(Math.max(...sorted.map((m) => m.weight))),
      representativeId: sorted[0].id,
      kinds: [...kindCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([kind, count]) => ({ kind, count })),
    })
  }

  // Deterministic output order: south→north, then west→east by key parts.
  clusters.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }))
  return clusters
}

/**
 * P13-T08 — density cap with deterministic priority. Keeps the top `cap`
 * items by `comparePoints`; never reorders beyond the comparison contract.
 */
export function applyDensityCap<T>(items: readonly T[], cap: number, scoreOf: (item: T) => ClusterablePoint): T[] {
  if (!Number.isFinite(cap) || cap <= 0) return []
  return [...items]
    .sort((a, b) => comparePoints(scoreOf(a), scoreOf(b)))
    .slice(0, Math.floor(cap))
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}
