/**
 * PLAN-201 — Deterministic reconciliation of tour_events + settings.route
 * into normalized tour_stops candidates. Unresolved conflicts are quarantined
 * (never invent org_id or silently drop competing sources).
 */

export const TOUR_STOP_TYPES = [
  "show",
  "rehearsal",
  "promo",
  "festival",
  "travel",
  "rest",
  "load",
  "other",
] as const

export type TourStopType = (typeof TOUR_STOP_TYPES)[number]

export const TOUR_PLAN_CONFLICT_TYPES = [
  "ordinal_mismatch",
  "route_only_orphan",
  "duplicate_event",
  "missing_event",
  "unresolvable_org",
  "duplicate_ordinal",
] as const

export type TourPlanConflictType = (typeof TOUR_PLAN_CONFLICT_TYPES)[number]

export interface TourEventLinkInput {
  id: string
  event_id: string
  ordinal: number | null
  market?: string | null
  leg_name?: string | null
  advance_status?: string | null
  routing_notes?: string | null
  event_title?: string | null
  event_start_at?: string | null
  venue_label?: string | null
  capacity?: number | null
  venue_id?: string | null
}

export interface RouteJsonStopInput {
  order?: number | null
  ordinal?: number | null
  name?: string | null
  venue?: string | null
  date?: string | null
  time?: string | null
  market?: string | null
  leg_name?: string | null
  capacity?: number | null
  advance_status?: string | null
  event_id?: string | null
  stop_type?: string | null
}

export interface TourStopCandidate {
  ordinal: number
  stop_type: TourStopType
  event_id: string | null
  tour_event_id: string | null
  name: string
  venue_label: string | null
  market: string | null
  leg_name: string | null
  local_date: string | null
  local_time: string | null
  capacity: number | null
  advance_status: string
  venue_id: string | null
  notes: string | null
  source: "tour_events" | "route_json" | "merged"
}

export interface TourPlanQuarantineCandidate {
  conflict_type: TourPlanConflictType
  reason: string
  source_ref: Record<string, unknown>
  payload: Record<string, unknown>
}

export interface TourPlanBackfillResult {
  stops: TourStopCandidate[]
  quarantine: TourPlanQuarantineCandidate[]
  /** True when a draft version + stops may be persisted. */
  canPersist: boolean
}

function normalizeStopType(raw: string | null | undefined): TourStopType {
  if (raw && (TOUR_STOP_TYPES as readonly string[]).includes(raw)) return raw as TourStopType
  return "show"
}

function sortTourEvents(links: TourEventLinkInput[]): TourEventLinkInput[] {
  return [...links].sort((left, right) => {
    const leftOrd = left.ordinal == null ? Number.POSITIVE_INFINITY : left.ordinal
    const rightOrd = right.ordinal == null ? Number.POSITIVE_INFINITY : right.ordinal
    if (leftOrd !== rightOrd) return leftOrd - rightOrd
    return String(left.event_id).localeCompare(String(right.event_id))
  })
}

function routeOrdinal(route: RouteJsonStopInput, index: number): number {
  if (typeof route.ordinal === "number" && Number.isFinite(route.ordinal)) return route.ordinal
  if (typeof route.order === "number" && Number.isFinite(route.order)) {
    // Legacy route uses 1-based order
    return Math.max(0, route.order - 1)
  }
  return index
}

/**
 * Deterministic backfill plan for one tour.
 * Prefer tour_events as authority; merge compatible route JSON fields;
 * quarantine conflicts instead of inventing links.
 */
export function buildTourPlanBackfill(args: {
  orgId: string | null
  tourId: string
  tourEvents: TourEventLinkInput[]
  routeJson: RouteJsonStopInput[]
}): TourPlanBackfillResult {
  const quarantine: TourPlanQuarantineCandidate[] = []

  if (!args.orgId) {
    quarantine.push({
      conflict_type: "unresolvable_org",
      reason: "Tour is missing org_id; refuse to invent organization scope for normalized plan.",
      source_ref: { tour_id: args.tourId },
      payload: {
        tour_event_count: args.tourEvents.length,
        route_count: args.routeJson.length,
      },
    })
    return { stops: [], quarantine, canPersist: false }
  }

  const sortedLinks = sortTourEvents(args.tourEvents)
  const stops: TourStopCandidate[] = []
  const usedOrdinals = new Set<number>()
  const eventToStopIndex = new Map<string, number>()

  for (let index = 0; index < sortedLinks.length; index += 1) {
    const link = sortedLinks[index]
    let ordinal = link.ordinal == null ? index : link.ordinal
    if (usedOrdinals.has(ordinal)) {
      quarantine.push({
        conflict_type: "duplicate_ordinal",
        reason: `Duplicate ordinal ${ordinal} on tour_events; assigned next free ordinal.`,
        source_ref: { tour_event_id: link.id, event_id: link.event_id, ordinal },
        payload: { link },
      })
      while (usedOrdinals.has(ordinal)) ordinal += 1
    }
    usedOrdinals.add(ordinal)

    const startAt = link.event_start_at ? String(link.event_start_at) : null
    const stop: TourStopCandidate = {
      ordinal,
      stop_type: "show",
      event_id: link.event_id,
      tour_event_id: link.id,
      name: link.event_title?.trim() || `Stop ${ordinal + 1}`,
      venue_label: link.venue_label ?? null,
      market: link.market ?? null,
      leg_name: link.leg_name ?? null,
      local_date: startAt ? startAt.slice(0, 10) : null,
      local_time: startAt && startAt.length >= 16 ? startAt.slice(11, 16) : null,
      capacity: link.capacity ?? null,
      advance_status: link.advance_status || "not_started",
      venue_id: link.venue_id ?? null,
      notes: link.routing_notes ?? null,
      source: "tour_events",
    }
    eventToStopIndex.set(link.event_id, stops.length)
    stops.push(stop)
  }

  const route = Array.isArray(args.routeJson) ? args.routeJson : []
  for (let index = 0; index < route.length; index += 1) {
    const row = route[index] || {}
    const ordinal = routeOrdinal(row, index)
    const eventId = row.event_id ? String(row.event_id) : null

    if (eventId && eventToStopIndex.has(eventId)) {
      const stop = stops[eventToStopIndex.get(eventId)!]
      const routeOrd = ordinal
      if (stop.ordinal !== routeOrd && usedOrdinals.has(routeOrd) && routeOrd !== stop.ordinal) {
        quarantine.push({
          conflict_type: "ordinal_mismatch",
          reason: `Route JSON ordinal ${routeOrd} disagrees with tour_events ordinal ${stop.ordinal} for event ${eventId}.`,
          source_ref: {
            event_id: eventId,
            tour_event_id: stop.tour_event_id,
            route_index: index,
            route_ordinal: routeOrd,
            stop_ordinal: stop.ordinal,
          },
          payload: { route: row, stop },
        })
      }
      // Merge empty fields only (deterministic, non-destructive).
      if (!stop.venue_label && row.venue) stop.venue_label = String(row.venue)
      if (!stop.market && row.market) stop.market = String(row.market)
      if (!stop.leg_name && row.leg_name) stop.leg_name = String(row.leg_name)
      if (!stop.local_date && row.date) stop.local_date = String(row.date).slice(0, 10)
      if (!stop.local_time && row.time) stop.local_time = String(row.time).slice(0, 5)
      if (stop.capacity == null && row.capacity != null) stop.capacity = Number(row.capacity)
      if (row.name && stop.name.startsWith("Stop ")) stop.name = String(row.name)
      stop.source = "merged"
      continue
    }

    if (eventId && !eventToStopIndex.has(eventId)) {
      quarantine.push({
        conflict_type: "missing_event",
        reason: `Route JSON references event ${eventId} that is not linked in tour_events.`,
        source_ref: { event_id: eventId, route_index: index, ordinal },
        payload: { route: row },
      })
      continue
    }

    // Route-only row (no event_id): allow as non-show draft stop when ordinal free.
    if (usedOrdinals.has(ordinal)) {
      const conflicting = stops.find((stop) => stop.ordinal === ordinal)
      quarantine.push({
        conflict_type: "ordinal_mismatch",
        reason: `Route-only stop conflicts with existing ordinal ${ordinal}.`,
        source_ref: {
          route_index: index,
          ordinal,
          conflicting_event_id: conflicting?.event_id ?? null,
        },
        payload: { route: row, conflicting },
      })
      continue
    }

    if (!row.name?.trim() && !row.date) {
      quarantine.push({
        conflict_type: "route_only_orphan",
        reason: "Route JSON stop lacks name and date; cannot create a normalized stop.",
        source_ref: { route_index: index, ordinal },
        payload: { route: row },
      })
      continue
    }

    usedOrdinals.add(ordinal)
    stops.push({
      ordinal,
      stop_type: normalizeStopType(row.stop_type),
      event_id: null,
      tour_event_id: null,
      name: row.name?.trim() || `Stop ${ordinal + 1}`,
      venue_label: row.venue ? String(row.venue) : null,
      market: row.market ? String(row.market) : null,
      leg_name: row.leg_name ? String(row.leg_name) : null,
      local_date: row.date ? String(row.date).slice(0, 10) : null,
      local_time: row.time ? String(row.time).slice(0, 5) : null,
      capacity: row.capacity == null ? null : Number(row.capacity),
      advance_status: row.advance_status || "not_started",
      venue_id: null,
      notes: null,
      source: "route_json",
    })
  }

  stops.sort((left, right) => {
    if (left.ordinal !== right.ordinal) return left.ordinal - right.ordinal
    return String(left.event_id || "").localeCompare(String(right.event_id || ""))
  })

  return {
    stops,
    quarantine,
    canPersist: true,
  }
}
