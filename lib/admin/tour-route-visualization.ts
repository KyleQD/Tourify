/**
 * ROUTE-308 — Route visualization data model (pure).
 *
 * Produces a stable, typed data contract consumed by map and timeline
 * UI components. The model clearly distinguishes five planning states
 * for stops and legs:
 *
 *  • confirmed  — stop confirmed (event published / hold converted)
 *  • held       — venue hold active (not yet confirmed)
 *  • tentative  — stop planned but no hold/event attached
 *  • travel     — travel/transit day (no show)
 *  • conflict   — constraint violations exist on this stop or adjacent leg
 *
 * The same data is exposed as an accessible flat list (RouteAccessibleEntry)
 * so screen readers and keyboard-only users get equivalent information.
 *
 * Pure: no I/O, no `server-only`. All inputs are plain value objects.
 */

import type { TourRouteLeg } from "@/lib/admin/tour-route-legs"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Stop display state
// ---------------------------------------------------------------------------

export type RouteStopDisplayState =
  | "confirmed"   // event published or hold explicitly confirmed
  | "held"        // active venue hold (at least one non-expired hold)
  | "tentative"   // planned stop — no hold, no confirmed event
  | "travel"      // travel/rest/transit day
  | "conflict"    // has one or more constraint violations (may overlap other states)

export type RouteLegDisplayState =
  | "ok"          // no violations
  | "conflict"    // one or more violations attached to this leg
  | "unknown"     // no distance/duration data — provider estimate missing

// ---------------------------------------------------------------------------
// Stop classification inputs
// ---------------------------------------------------------------------------

export interface VisualizationStop {
  id: string
  ordinal: number
  name: string
  stop_type?: string | null
  /** YYYY-MM-DD local date. */
  local_date?: string | null
  /** UTC ISO — show start. */
  start_utc?: string | null
  /** UTC ISO — show end / load-out. */
  end_utc?: string | null
  /** IANA zone. */
  ianaZone?: string | null
  /** Venue label or free-text draft. */
  venue_label?: string | null
  /**
   * Lat/lng for map rendering. Null when location is unresolved.
   */
  coordinates?: { lat: number; lng: number } | null
  /**
   * True when this stop has a published/confirmed event (converted hold or
   * published event record exists).
   */
  is_confirmed?: boolean
  /**
   * True when this stop has at least one active (non-expired, non-released)
   * venue hold.
   */
  has_active_hold?: boolean
}

// ---------------------------------------------------------------------------
// Classified stop / leg for rendering
// ---------------------------------------------------------------------------

export interface RouteMapStop {
  stopId: string
  ordinal: number
  name: string
  displayState: RouteStopDisplayState
  /**
   * Secondary state when the stop ALSO has conflicts.
   * A confirmed stop can still have conflict state on its adjacent leg.
   */
  hasConflict: boolean
  local_date: string | null
  start_utc: string | null
  end_utc: string | null
  ianaZone: string | null
  venue_label: string | null
  coordinates: { lat: number; lng: number } | null
  /** Violation codes attached to this stop (same-day, missing-location, etc.). */
  violationCodes: string[]
}

export interface RouteMapLeg {
  legId: string | null
  fromStopId: string
  toStopId: string
  fromOrdinal: number
  toOrdinal: number
  displayState: RouteLegDisplayState
  transport_mode: TourRouteLeg["transport_mode"]
  /** Effective distance (override > provider). Null when unknown. */
  distance_km: number | null
  /** Effective duration minutes. Null when unknown. */
  duration_minutes: number | null
  /** Violation codes on this leg. */
  violationCodes: string[]
}

// ---------------------------------------------------------------------------
// Accessible list entry (screen reader / keyboard-only equivalent)
// ---------------------------------------------------------------------------

export type RouteAccessibleEntryKind = "stop" | "leg"

export interface RouteAccessibleEntry {
  kind: RouteAccessibleEntryKind
  /** Unique key for list rendering (React key). */
  key: string
  /** Primary label for the entry. */
  label: string
  /** Human-readable state description (e.g. "Confirmed show"). */
  stateDescription: string
  /** Additional detail line (date, distance, duration). */
  detail: string | null
  /** Whether this entry has a conflict that needs attention. */
  hasConflict: boolean
  /** ARIA role hint for the rendered element. */
  ariaRole: "listitem"
}

// ---------------------------------------------------------------------------
// Full visualization contract
// ---------------------------------------------------------------------------

export interface RouteVisualizationData {
  /** All map stops in ordinal order. */
  stops: RouteMapStop[]
  /** All legs in ordinal order. */
  legs: RouteMapLeg[]
  /** Flat accessible list interleaving stops and legs. */
  accessibleList: RouteAccessibleEntry[]
  /** Summary counts for the legend. */
  summary: {
    confirmed: number
    held: number
    tentative: number
    travel: number
    conflicted: number
    unknownLegs: number
  }
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

const TRAVEL_STOP_TYPES = new Set(["travel", "rest", "load", "warehouse", "other"])

function classifyStopState(stop: VisualizationStop): RouteStopDisplayState {
  const type = stop.stop_type ?? "show"
  if (TRAVEL_STOP_TYPES.has(type)) return "travel"
  if (stop.is_confirmed) return "confirmed"
  if (stop.has_active_hold) return "held"
  return "tentative"
}

function legDisplayState(leg: TourRouteLeg, hasViolation: boolean): RouteLegDisplayState {
  if (hasViolation) return "conflict"
  const effDist = leg.override?.distance_km ?? leg.distance_km
  const effDur = leg.override?.duration_minutes ?? leg.duration_minutes
  if (effDist == null && effDur == null) return "unknown"
  return "ok"
}

function stopStateDescription(state: RouteStopDisplayState, stop_type?: string | null): string {
  const type = stop_type ?? "show"
  switch (state) {
    case "confirmed": return `Confirmed ${type}`
    case "held":      return `Held ${type} — venue hold active`
    case "tentative": return `Tentative ${type} — no hold or event`
    case "travel":    return `${type.charAt(0).toUpperCase() + type.slice(1)} day`
    case "conflict":  return `Conflict on ${type}`
  }
}

function legStateDescription(state: RouteLegDisplayState, mode: string): string {
  switch (state) {
    case "ok":       return `${mode} leg — no issues`
    case "conflict": return `${mode} leg — constraint violations`
    case "unknown":  return `${mode} leg — distance/duration unknown`
  }
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "unknown duration"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Build the full route visualization data contract from stops, legs,
 * and constraint violations.
 *
 * The result is consumed directly by map and timeline UI components.
 * The `accessibleList` provides an equivalent flat representation for
 * screen readers and keyboard navigation.
 */
export function buildRouteVisualization(args: {
  stops: VisualizationStop[]
  legs: TourRouteLeg[]
  violations: RouteConstraintViolation[]
}): RouteVisualizationData {
  const { stops, legs, violations } = args

  // Index violations by stop id and leg id for O(1) lookup
  const violationsByStop = new Map<string, RouteConstraintViolation[]>()
  const violationsByLeg = new Map<string, RouteConstraintViolation[]>()

  for (const v of violations) {
    if (v.fromStopId) {
      if (!violationsByStop.has(v.fromStopId)) violationsByStop.set(v.fromStopId, [])
      violationsByStop.get(v.fromStopId)!.push(v)
    }
    if (v.toStopId) {
      if (!violationsByStop.has(v.toStopId)) violationsByStop.set(v.toStopId, [])
      violationsByStop.get(v.toStopId)!.push(v)
    }
    if (v.legId) {
      if (!violationsByLeg.has(v.legId)) violationsByLeg.set(v.legId, [])
      violationsByLeg.get(v.legId)!.push(v)
    }
  }

  const sortedStops = [...stops].sort((a, b) => a.ordinal - b.ordinal)
  const sortedLegs = [...legs].sort((a, b) => a.from_ordinal - b.from_ordinal)

  // Build map stops
  const mapStops: RouteMapStop[] = sortedStops.map((stop) => {
    const stopViolations = violationsByStop.get(stop.id) ?? []
    const primaryState = classifyStopState(stop)
    const hasConflict = stopViolations.length > 0

    return {
      stopId: stop.id,
      ordinal: stop.ordinal,
      name: stop.name,
      displayState: primaryState,
      hasConflict,
      local_date: stop.local_date ?? null,
      start_utc: stop.start_utc ?? null,
      end_utc: stop.end_utc ?? null,
      ianaZone: stop.ianaZone ?? null,
      venue_label: stop.venue_label ?? null,
      coordinates: stop.coordinates ?? null,
      violationCodes: [...new Set(stopViolations.map((v) => v.code))],
    }
  })

  // Build map legs
  const mapLegs: RouteMapLeg[] = sortedLegs.map((leg) => {
    const legViolations = violationsByLeg.get(leg.id ?? "") ?? []
    const hasViolation = legViolations.length > 0
    const state = legDisplayState(leg, hasViolation)
    const effDist = leg.override?.distance_km ?? leg.distance_km
    const effDur = leg.override?.duration_minutes ?? leg.duration_minutes

    return {
      legId: leg.id,
      fromStopId: leg.from_stop_id,
      toStopId: leg.to_stop_id,
      fromOrdinal: leg.from_ordinal,
      toOrdinal: leg.to_ordinal,
      displayState: state,
      transport_mode: leg.transport_mode,
      distance_km: effDist,
      duration_minutes: effDur,
      violationCodes: [...new Set(legViolations.map((v) => v.code))],
    }
  })

  // Build accessible list (stops interleaved with legs)
  const stopMap = new Map(mapStops.map((s) => [s.stopId, s]))
  const accessibleList: RouteAccessibleEntry[] = []

  for (let i = 0; i < sortedStops.length; i++) {
    const ms = stopMap.get(sortedStops[i].id)
    if (!ms) continue

    const stopDetail = [
      ms.local_date,
      ms.venue_label,
    ]
      .filter(Boolean)
      .join(" · ")

    accessibleList.push({
      kind: "stop",
      key: `stop-${ms.stopId}`,
      label: ms.name,
      stateDescription: stopStateDescription(ms.displayState, sortedStops[i].stop_type),
      detail: stopDetail || null,
      hasConflict: ms.hasConflict,
      ariaRole: "listitem",
    })

    // Insert leg entry between this stop and the next
    if (i < sortedStops.length - 1) {
      const nextStop = sortedStops[i + 1]
      const leg = mapLegs.find(
        (l) => l.fromStopId === sortedStops[i].id && l.toStopId === nextStop.id,
      )
      if (leg) {
        const legDetail = [
          leg.distance_km != null ? `${Math.round(leg.distance_km)} km` : null,
          formatDuration(leg.duration_minutes),
        ]
          .filter(Boolean)
          .join(" · ")

        accessibleList.push({
          kind: "leg",
          key: `leg-${leg.fromStopId}-${leg.toStopId}`,
          label: `${ms.name} → ${nextStop.name}`,
          stateDescription: legStateDescription(leg.displayState, leg.transport_mode),
          detail: legDetail,
          hasConflict: leg.displayState === "conflict",
          ariaRole: "listitem",
        })
      }
    }
  }

  // Summary counts
  const summary = {
    confirmed: mapStops.filter((s) => s.displayState === "confirmed").length,
    held: mapStops.filter((s) => s.displayState === "held").length,
    tentative: mapStops.filter((s) => s.displayState === "tentative").length,
    travel: mapStops.filter((s) => s.displayState === "travel").length,
    conflicted: mapStops.filter((s) => s.hasConflict).length,
    unknownLegs: mapLegs.filter((l) => l.displayState === "unknown").length,
  }

  return { stops: mapStops, legs: mapLegs, accessibleList, summary }
}

// ---------------------------------------------------------------------------
// Legend helper (for UI legend components)
// ---------------------------------------------------------------------------

export interface RouteLegendItem {
  state: RouteStopDisplayState | RouteLegDisplayState
  label: string
  description: string
}

/**
 * Returns the canonical legend definition for all display states.
 * UI components should use this to render the map/timeline legend
 * so the legend is always in sync with the classification logic.
 */
export function getRouteLegend(): RouteLegendItem[] {
  return [
    { state: "confirmed", label: "Confirmed", description: "Stop has a confirmed event or converted hold." },
    { state: "held",      label: "Held",      description: "Venue hold active — awaiting confirmation." },
    { state: "tentative", label: "Tentative", description: "Planned stop — no hold or event yet." },
    { state: "travel",    label: "Travel / Rest", description: "Travel, rest, or transit day." },
    { state: "conflict",  label: "Conflict",  description: "One or more route constraint violations." },
    { state: "ok",        label: "Leg OK",    description: "Travel leg with no issues." },
    { state: "unknown",   label: "Leg Unknown", description: "Travel leg with no distance/duration data." },
  ]
}
