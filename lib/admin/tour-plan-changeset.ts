/**
 * PLAN-207 — Post-publication change sets and categorized diffs.
 */

export type TourChangeCategory =
  | "stops"
  | "dates"
  | "venue"
  | "route"
  | "party"
  | "travel"
  | "lodging"
  | "schedules"
  | "advance"
  | "budget"
  | "publications"

export interface TourPlanSnapshotStop {
  event_id?: string | null
  ordinal: number
  name: string
  date?: string | null
  venue?: string | null
  stop_type?: string | null
}

export interface TourPlanSnapshot {
  name?: string | null
  start_date?: string | null
  end_date?: string | null
  route_notes?: string | null
  stops: TourPlanSnapshotStop[]
  party_count?: number
  travel_notes?: string | null
  lodging_notes?: string | null
  budget?: number | null
  publication_ids?: string[]
  vendor_ids?: string[]
  ticketed_event_ids?: string[]
}

export interface TourChangeSetItem {
  category: TourChangeCategory
  field: string
  before: unknown
  after: unknown
  affected: {
    publications: string[]
    people: number
    bookings: number
    schedules: number
    tickets: number
    vendors: number
    budgets: boolean
  }
}

export interface TourChangeSet {
  fromVersion: number
  toVersion: number
  items: TourChangeSetItem[]
  categories: TourChangeCategory[]
  summary: string
}

function stopKey(stop: TourPlanSnapshotStop): string {
  return stop.event_id || `ordinal:${stop.ordinal}:${stop.name}`
}

export function buildTourPlanChangeSet(args: {
  fromVersion: number
  toVersion: number
  before: TourPlanSnapshot
  after: TourPlanSnapshot
}): TourChangeSet {
  const items: TourChangeSetItem[] = []
  const pubs = args.after.publication_ids || args.before.publication_ids || []
  const vendors = new Set([...(args.before.vendor_ids || []), ...(args.after.vendor_ids || [])])
  const ticketed = new Set([
    ...(args.before.ticketed_event_ids || []),
    ...(args.after.ticketed_event_ids || []),
  ])

  function push(
    category: TourChangeCategory,
    field: string,
    before: unknown,
    after: unknown,
    extras?: Partial<TourChangeSetItem["affected"]>,
  ) {
    if (JSON.stringify(before) === JSON.stringify(after)) return
    items.push({
      category,
      field,
      before,
      after,
      affected: {
        publications: pubs,
        people: extras?.people ?? args.after.party_count ?? args.before.party_count ?? 0,
        bookings: extras?.bookings ?? 0,
        schedules: extras?.schedules ?? 0,
        tickets: extras?.tickets ?? ticketed.size,
        vendors: extras?.vendors ?? vendors.size,
        budgets: extras?.budgets ?? false,
      },
    })
  }

  push("stops", "name", args.before.name, args.after.name)
  push("dates", "start_date", args.before.start_date, args.after.start_date, { schedules: 1 })
  push("dates", "end_date", args.before.end_date, args.after.end_date, { schedules: 1 })
  push("route", "route_notes", args.before.route_notes, args.after.route_notes)
  push("budget", "budget", args.before.budget, args.after.budget, { budgets: true })
  push("travel", "travel_notes", args.before.travel_notes, args.after.travel_notes)
  push("lodging", "lodging_notes", args.before.lodging_notes, args.after.lodging_notes)
  push("party", "party_count", args.before.party_count, args.after.party_count, {
    people: Number(args.after.party_count || 0),
  })

  const beforeMap = new Map(args.before.stops.map((stop) => [stopKey(stop), stop]))
  const afterMap = new Map(args.after.stops.map((stop) => [stopKey(stop), stop]))

  for (const [key, afterStop] of afterMap) {
    const beforeStop = beforeMap.get(key)
    if (!beforeStop) {
      push("stops", "stop_added", null, afterStop, {
        bookings: afterStop.event_id && ticketed.has(afterStop.event_id) ? 1 : 0,
        tickets: afterStop.event_id && ticketed.has(afterStop.event_id) ? 1 : 0,
      })
      continue
    }
    if (beforeStop.date !== afterStop.date) {
      push("dates", `stop.${key}.date`, beforeStop.date, afterStop.date, { schedules: 1 })
    }
    if (beforeStop.venue !== afterStop.venue) {
      push("venue", `stop.${key}.venue`, beforeStop.venue, afterStop.venue, { bookings: 1 })
    }
    if (beforeStop.ordinal !== afterStop.ordinal) {
      push("route", `stop.${key}.ordinal`, beforeStop.ordinal, afterStop.ordinal)
    }
    if (beforeStop.name !== afterStop.name) {
      push("stops", `stop.${key}.name`, beforeStop.name, afterStop.name)
    }
  }

  for (const [key, beforeStop] of beforeMap) {
    if (!afterMap.has(key)) {
      push("stops", "stop_removed", beforeStop, null, {
        tickets: beforeStop.event_id && ticketed.has(beforeStop.event_id) ? 1 : 0,
      })
    }
  }

  if ((args.before.publication_ids || []).join() !== (args.after.publication_ids || []).join()) {
    push(
      "publications",
      "publication_ids",
      args.before.publication_ids || [],
      args.after.publication_ids || [],
    )
  }

  const categories = [...new Set(items.map((item) => item.category))]
  return {
    fromVersion: args.fromVersion,
    toVersion: args.toVersion,
    items,
    categories,
    summary:
      items.length === 0
        ? "No plan differences."
        : `${items.length} change(s) across ${categories.join(", ")}.`,
  }
}
