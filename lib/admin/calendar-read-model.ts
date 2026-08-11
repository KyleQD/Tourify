/**
 * CAL-401 — Canonical calendar read model.
 *
 * Stable source adapters return authorized calendar items with freshness
 * indicators and errors; avoids N+1/client fanout patterns.
 *
 * CAL-402 — Calendar views and filters.
 * CAL-403 — Conflict overlays.
 * CAL-404 — Drag/edit command preview.
 * CAL-405 — ICS snapshot/export.
 * CAL-406 — Subscription feeds.
 *
 * All in one pure domain module.
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// CAL-401 — Calendar read model
// ---------------------------------------------------------------------------

export const CALENDAR_SOURCE_TYPES = [
  "ros_item",
  "shift",
  "travel",
  "lodging",
  "advance_deadline",
  "equipment_move",
  "hold",
  "obligation",
  "rest_day",
  "event",
] as const
export type CalendarSourceType = (typeof CALENDAR_SOURCE_TYPES)[number]

export type CalendarItemStatus =
  | "confirmed"
  | "tentative"
  | "cancelled"
  | "conflict"
  | "pending"

export interface CalendarItem {
  item_id: string
  source_type: CalendarSourceType
  source_id: string
  title: string
  start_utc: string
  end_utc: string
  /** IANA time zone name for display. */
  display_tz: string
  status: CalendarItemStatus
  owner_id: string | null
  department: string | null
  tour_id: string | null
  stop_id: string | null
  event_id: string | null
  /** Whether this item is visible to this caller's authorization scope. */
  is_authorized: boolean
}

export interface CalendarSourceHealth {
  source_type: CalendarSourceType
  last_synced_at: string | null
  error: string | null
  is_fresh: boolean
}

export interface CalendarReadModel {
  items: CalendarItem[]
  source_health: CalendarSourceHealth[]
  /** ISO datetime of when the read model was built. */
  built_at: string
}

export function buildCalendarReadModel(
  items: CalendarItem[],
  source_health: CalendarSourceHealth[],
  now: string,
): CalendarReadModel {
  return { items, source_health, built_at: now }
}

export function getStaleOrErrorSources(health: readonly CalendarSourceHealth[]): CalendarSourceHealth[] {
  return health.filter((h) => !h.is_fresh || h.error !== null)
}

// ---------------------------------------------------------------------------
// CAL-402 — Views and filters
// ---------------------------------------------------------------------------

export type CalendarViewType = "month" | "week" | "day" | "agenda"

export interface CalendarFilter {
  view: CalendarViewType
  range_start: string
  range_end: string
  source_types?: CalendarSourceType[]
  owner_ids?: string[]
  departments?: string[]
  tour_id?: string | null
  stop_id?: string | null
  statuses?: CalendarItemStatus[]
  display_tz: string
}

export function applyCalendarFilter(
  items: readonly CalendarItem[],
  filter: CalendarFilter,
): CalendarItem[] {
  return items.filter((item) => {
    if (!item.is_authorized) return false
    if (item.start_utc >= filter.range_end || item.end_utc <= filter.range_start) return false
    if (filter.source_types && !filter.source_types.includes(item.source_type)) return false
    if (filter.owner_ids && item.owner_id && !filter.owner_ids.includes(item.owner_id)) return false
    if (filter.departments && item.department && !filter.departments.includes(item.department)) return false
    if (filter.tour_id !== undefined && filter.tour_id !== null && item.tour_id !== filter.tour_id) return false
    if (filter.stop_id !== undefined && filter.stop_id !== null && item.stop_id !== filter.stop_id) return false
    if (filter.statuses && !filter.statuses.includes(item.status)) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// CAL-403 — Conflict overlays
// ---------------------------------------------------------------------------

export type CalendarConflictType =
  | "route_connection"
  | "travel_connection"
  | "shift_overlap"
  | "rest_violation"
  | "venue_overlap"
  | "equipment_unavailable"
  | "deadline_overdue"
  | "obligation_conflict"

export interface CalendarConflict {
  conflict_id: string
  conflict_type: CalendarConflictType
  items: [string, string]   // Two conflicting item_ids
  severity: "blocking" | "warning"
  /** Link to the owning domain surface for remediation. */
  remediation_link: string | null
  detail: string
}

export function detectOverlapConflicts(
  items: readonly CalendarItem[],
): CalendarConflict[] {
  const conflicts: CalendarConflict[] = []

  // Simple O(n²) overlap detection for items with same owner
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]
      if (a.owner_id && a.owner_id === b.owner_id) {
        const overlap = a.start_utc < b.end_utc && b.start_utc < a.end_utc
        if (overlap) {
          conflicts.push({
            conflict_id: `conflict-${a.item_id}-${b.item_id}`,
            conflict_type: "shift_overlap",
            items: [a.item_id, b.item_id],
            severity: "blocking",
            remediation_link: null,
            detail: `${a.title} and ${b.title} overlap for owner ${a.owner_id}`,
          })
        }
      }
    }
  }
  return conflicts
}

// ---------------------------------------------------------------------------
// CAL-404 — Drag/edit command preview
// ---------------------------------------------------------------------------

export type EditCommandType = "move" | "resize"

export interface CalendarEditCommand {
  item_id: string
  command_type: EditCommandType
  proposed_start_utc: string
  proposed_end_utc: string
}

export type EditPreviewOutcome = "allowed" | "blocked" | "requires_confirmation"

export interface CalendarEditPreview {
  item_id: string
  outcome: EditPreviewOutcome
  /** The display-friendly interpretation of the proposed change. */
  interpretation: string
  affected_items: string[]
  validation_issues: string[]
  /** Whether the source supports editing (read-only sources block editing). */
  is_source_editable: boolean
}

const READ_ONLY_SOURCES: CalendarSourceType[] = ["travel", "lodging", "advance_deadline", "equipment_move"]

export function previewCalendarEdit(
  item: CalendarItem,
  command: CalendarEditCommand,
  overlapping: readonly CalendarItem[],
): CalendarEditPreview {
  const is_source_editable = !READ_ONLY_SOURCES.includes(item.source_type)

  if (!is_source_editable) {
    return {
      item_id: item.item_id,
      outcome: "blocked",
      interpretation: `${item.source_type} items are read-only and cannot be edited from the calendar.`,
      affected_items: [],
      validation_issues: ["Source is read-only"],
      is_source_editable: false,
    }
  }

  const validation_issues: string[] = []
  if (command.proposed_end_utc <= command.proposed_start_utc) {
    validation_issues.push("End time must be after start time")
  }

  const affected_items = overlapping.map((i) => i.item_id)
  const outcome: EditPreviewOutcome = validation_issues.length > 0
    ? "blocked"
    : overlapping.length > 0
    ? "requires_confirmation"
    : "allowed"

  return {
    item_id: item.item_id,
    outcome,
    interpretation: `Move '${item.title}' to ${command.proposed_start_utc} – ${command.proposed_end_utc} (${item.display_tz})`,
    affected_items,
    validation_issues,
    is_source_editable: true,
  }
}

// ---------------------------------------------------------------------------
// CAL-405 — ICS snapshot/export
// ---------------------------------------------------------------------------

export interface IcsCalendarItem {
  uid: string
  summary: string
  dtstart: string
  dtend: string
  tzid: string
  sequence: number
  status: "CONFIRMED" | "TENTATIVE" | "CANCELLED"
  description: string | null
}

export interface IcsSnapshot {
  snapshot_id: string
  audience_class: string
  items: IcsCalendarItem[]
  generated_at: string
  /** Increments on each export for the same audience/scope. */
  version: number
}

export function buildIcsItem(item: CalendarItem, sequence: number): IcsCalendarItem {
  const icsStatus: IcsCalendarItem["status"] =
    item.status === "cancelled" ? "CANCELLED" :
    item.status === "tentative" ? "TENTATIVE" : "CONFIRMED"

  return {
    uid: `${item.item_id}@tourify`,
    summary: item.title,
    dtstart: item.start_utc,
    dtend: item.end_utc,
    tzid: item.display_tz,
    sequence,
    status: icsStatus,
    description: null,
  }
}

export function buildIcsSnapshot(params: {
  snapshot_id: string
  audience_class: string
  items: CalendarItem[]
  version: number
  now: string
}): IcsSnapshot {
  return {
    snapshot_id: params.snapshot_id,
    audience_class: params.audience_class,
    items: params.items.filter((i) => i.is_authorized).map((i, idx) => buildIcsItem(i, idx + 1)),
    generated_at: params.now,
    version: params.version,
  }
}

// ---------------------------------------------------------------------------
// CAL-406 — Subscription feed tokens
// ---------------------------------------------------------------------------

export type FeedTokenStatus = "active" | "revoked" | "expired"

export interface CalendarFeedToken {
  token_id: string
  token_hash: string
  org_id: string
  owner_id: string
  scope: string[]
  status: FeedTokenStatus
  created_at: string
  expires_at: string | null
  last_accessed_at: string | null
  access_count: number
  revoked_by: string | null
  revoked_at: string | null
}

export interface FeedTokenAccessLog {
  token_id: string
  accessed_at: string
  ip_hint: string | null
}

export function createFeedToken(params: {
  token_id: string
  token_hash: string
  org_id: string
  owner_id: string
  scope: string[]
  expires_at: string | null
  now: string
}): CalendarFeedToken {
  return {
    token_id: params.token_id,
    token_hash: params.token_hash,
    org_id: params.org_id,
    owner_id: params.owner_id,
    scope: params.scope,
    status: "active",
    created_at: params.now,
    expires_at: params.expires_at,
    last_accessed_at: null,
    access_count: 0,
    revoked_by: null,
    revoked_at: null,
  }
}

export function revokeFeedToken(token: CalendarFeedToken, revokedBy: string, now: string): CalendarFeedToken {
  return { ...token, status: "revoked", revoked_by: revokedBy, revoked_at: now }
}

export function recordFeedTokenAccess(token: CalendarFeedToken, now: string): CalendarFeedToken {
  if (token.status !== "active") return token
  if (token.expires_at && token.expires_at < now) {
    return { ...token, status: "expired" }
  }
  return { ...token, last_accessed_at: now, access_count: token.access_count + 1 }
}

export function isFeedTokenUsable(token: CalendarFeedToken, now: string): boolean {
  if (token.status !== "active") return false
  if (token.expires_at && token.expires_at < now) return false
  return true
}
