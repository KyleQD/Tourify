/**
 * LIVE-401 — Create versioned run-of-show timeline
 *
 * A run-of-show (ROS) is a versioned operational timeline for an event.
 * Each RosVersion is immutable once published; edits create a new draft.
 *
 * Each RosItem carries:
 *   - Planned local + UTC time, duration_minutes
 *   - Dependency links (ordered_after) — must not form cycles
 *   - Location reference
 *   - Responsible owner_id and role label
 *   - Public / private notes (field-class controlled)
 *   - Template source reference (advance section or ROS template)
 *   - Actual time slots (set during live ops — separate from planned)
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// ROS version lifecycle
// ---------------------------------------------------------------------------

export type RosVersionStatus =
  | "draft"
  | "review"
  | "published"   // immutable once published
  | "superseded"  // a newer version has been published
  | "archived"

export interface RosVersion {
  id: string
  org_id: string
  event_id: string
  version_number: number
  status: RosVersionStatus
  previous_version_id?: string
  content_checksum: string
  published_by?: string
  published_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface RosVersionTransitionResult {
  ok: boolean
  status: RosVersionStatus
  error?: string
}

const ROS_VERSION_TRANSITIONS: Record<RosVersionStatus, RosVersionStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "published", "archived"],
  published: ["superseded"],
  superseded: [],   // terminal
  archived: [],     // terminal
}

export function transitionRosVersion(
  current: RosVersionStatus,
  next: RosVersionStatus,
): RosVersionTransitionResult {
  if (!ROS_VERSION_TRANSITIONS[current].includes(next)) {
    return { ok: false, status: current, error: `ROS version transition ${current} → ${next} is not allowed.` }
  }
  return { ok: true, status: next }
}

// ---------------------------------------------------------------------------
// ROS item category
// ---------------------------------------------------------------------------

export type RosItemCategory =
  | "load_in"
  | "soundcheck"
  | "show"
  | "curfew"
  | "load_out"
  | "production_meeting"
  | "meal"
  | "travel"
  | "rehearsal"
  | "press"
  | "security"
  | "hospitality"
  | "other"

// ---------------------------------------------------------------------------
// Location reference
// ---------------------------------------------------------------------------

export interface RosLocation {
  label: string            // e.g. "Stage", "Backstage Entrance – Gate C"
  venue_area?: string      // cross-reference to venue map area
  address_ref?: string     // optional address or map link
}

// ---------------------------------------------------------------------------
// Note visibility
// ---------------------------------------------------------------------------

export type NoteVisibility = "public" | "internal"

export interface RosItemNote {
  body: string
  visibility: NoteVisibility
  author_id: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Template source reference
// ---------------------------------------------------------------------------

export type RosTemplateSourceType =
  | "advance_section"   // derived from a frozen advance section
  | "ros_template"      // from an org-level ROS template
  | "manual"            // hand-created; no template source

export interface RosTemplateSource {
  type: RosTemplateSourceType
  source_id?: string    // advance_section_id or ros_template_item_id
}

// ---------------------------------------------------------------------------
// Actual time (live-ops capture; LIVE-410 extends this)
// ---------------------------------------------------------------------------

export interface RosItemActual {
  actual_start_utc?: string    // ISO-8601
  actual_end_utc?: string
  delay_minutes?: number
  delay_reason?: string
  recorded_by: string
  recorded_at: string
}

// ---------------------------------------------------------------------------
// Core ROS item
// ---------------------------------------------------------------------------

export interface RosItem {
  id: string
  ros_version_id: string
  event_id: string

  category: RosItemCategory
  title: string
  description?: string

  // Planned timing
  planned_start_local: string   // "HH:MM" local time
  planned_start_utc: string     // ISO-8601
  planned_end_utc: string       // ISO-8601 (derived: start + duration)
  duration_minutes: number

  // IANA time zone for this item's local time
  time_zone: string

  // Dependencies: this item must start after all listed items
  ordered_after: string[]       // ros_item_id[]

  // Location
  location?: RosLocation

  // Responsibility
  owner_id?: string
  role_label?: string           // e.g. "Production Manager"

  // Notes
  notes: RosItemNote[]

  // Template provenance
  source: RosTemplateSource

  // Actual timing (populated by live ops; does not mutate planned fields)
  actual?: RosItemActual

  // Is this item critical (unstaffed critical item is a validation error)?
  is_critical: boolean

  // Ordinal within the published sequence
  ordinal: number

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function makeRosItem(
  partial: Omit<RosItem, "notes" | "ordered_after" | "source" | "is_critical" | "ordinal" | "created_at" | "updated_at"> &
    Partial<Pick<RosItem, "notes" | "ordered_after" | "source" | "is_critical" | "ordinal">>,
  now?: string,
): RosItem {
  const ts = now ?? new Date().toISOString()
  return {
    notes: [],
    ordered_after: [],
    source: { type: "manual" },
    is_critical: false,
    ordinal: 0,
    created_at: ts,
    updated_at: ts,
    ...partial,
  }
}

// ---------------------------------------------------------------------------
// Add note (immutable append)
// ---------------------------------------------------------------------------

export function addRosItemNote(
  item: RosItem,
  note: Omit<RosItemNote, "created_at"> & { now?: string },
): RosItem {
  const { now, ...rest } = note
  const ts = now ?? new Date().toISOString()
  return { ...item, notes: [...item.notes, { ...rest, created_at: ts }], updated_at: ts }
}

// ---------------------------------------------------------------------------
// Record actual timing (non-mutating on planned fields)
// ---------------------------------------------------------------------------

export function recordActualTime(
  item: RosItem,
  actual: RosItemActual,
  now?: string,
): RosItem {
  const ts = now ?? new Date().toISOString()
  return { ...item, actual, updated_at: ts }
}

// ---------------------------------------------------------------------------
// Dependency helpers
// ---------------------------------------------------------------------------

export function addDependency(item: RosItem, dependsOnId: string): RosItem {
  if (item.ordered_after.includes(dependsOnId)) return item  // idempotent
  if (item.id === dependsOnId) {
    throw new Error(`Item '${item.id}' cannot depend on itself.`)
  }
  return { ...item, ordered_after: [...item.ordered_after, dependsOnId] }
}

/**
 * Detects a cycle using DFS.  Returns the cycle path if one exists, else null.
 */
export function detectDependencyCycle(
  items: RosItem[],
): string[] | null {
  const adjMap = new Map<string, string[]>()
  for (const item of items) {
    adjMap.set(item.id, item.ordered_after)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string, path: string[]): string[] | null {
    if (inStack.has(nodeId)) return [...path, nodeId]
    if (visited.has(nodeId)) return null
    visited.add(nodeId)
    inStack.add(nodeId)
    for (const dep of adjMap.get(nodeId) ?? []) {
      const cycle = dfs(dep, [...path, nodeId])
      if (cycle) return cycle
    }
    inStack.delete(nodeId)
    return null
  }

  for (const item of items) {
    if (!visited.has(item.id)) {
      const cycle = dfs(item.id, [])
      if (cycle) return cycle
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Compute planned_end_utc
// ---------------------------------------------------------------------------

export function computePlannedEndUtc(startUtc: string, durationMinutes: number): string {
  const d = new Date(startUtc)
  d.setMinutes(d.getMinutes() + durationMinutes)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// ROS version publish
// ---------------------------------------------------------------------------

export function publishRosVersion(
  version: RosVersion,
  publishedBy: string,
  checksum: string,
  now?: string,
): RosVersion {
  const result = transitionRosVersion(version.status, "published")
  if (!result.ok) throw new Error(result.error)
  const ts = now ?? new Date().toISOString()
  return { ...version, status: "published", published_by: publishedBy, published_at: ts, content_checksum: checksum, updated_at: ts }
}

// ---------------------------------------------------------------------------
// Create new draft version from existing published version
// ---------------------------------------------------------------------------

export function createNewRosDraft(
  existing: RosVersion,
  newId: string,
  createdBy: string,
  now?: string,
): { superseded: RosVersion; draft: RosVersion } {
  if (existing.status !== "published") {
    throw new Error(`Can only branch from a published version (current status: ${existing.status}).`)
  }
  const ts = now ?? new Date().toISOString()
  const superseded: RosVersion = { ...existing, status: "superseded", updated_at: ts }
  const draft: RosVersion = {
    id: newId,
    org_id: existing.org_id,
    event_id: existing.event_id,
    version_number: existing.version_number + 1,
    status: "draft",
    previous_version_id: existing.id,
    content_checksum: "",
    created_by: createdBy,
    created_at: ts,
    updated_at: ts,
  }
  return { superseded, draft }
}

// ---------------------------------------------------------------------------
// ROS diff (item-level delta between two version item sets)
// ---------------------------------------------------------------------------

export type RosItemDiffStatus = "added" | "updated" | "removed" | "unchanged"

export interface RosItemDiff {
  item_id: string
  title: string
  diff_status: RosItemDiffStatus
  changed_fields?: string[]
}

export function diffRosItems(
  previous: RosItem[],
  current: RosItem[],
): RosItemDiff[] {
  const prevMap = new Map(previous.map((i) => [i.id, i]))
  const currMap = new Map(current.map((i) => [i.id, i]))
  const result: RosItemDiff[] = []

  for (const [id, curr] of currMap.entries()) {
    const prev = prevMap.get(id)
    if (!prev) {
      result.push({ item_id: id, title: curr.title, diff_status: "added" })
    } else {
      const changed = detectChangedFields(prev, curr)
      result.push({
        item_id: id,
        title: curr.title,
        diff_status: changed.length > 0 ? "updated" : "unchanged",
        changed_fields: changed.length > 0 ? changed : undefined,
      })
    }
  }

  for (const [id, prev] of prevMap.entries()) {
    if (!currMap.has(id)) {
      result.push({ item_id: id, title: prev.title, diff_status: "removed" })
    }
  }

  return result
}

const DIFF_FIELDS: (keyof RosItem)[] = [
  "title", "planned_start_utc", "planned_end_utc", "duration_minutes",
  "location", "owner_id", "role_label", "is_critical", "ordinal",
  "category",
]

function detectChangedFields(prev: RosItem, curr: RosItem): string[] {
  return DIFF_FIELDS.filter((f) => JSON.stringify(prev[f]) !== JSON.stringify(curr[f]))
}

// ---------------------------------------------------------------------------
// Timeline summary
// ---------------------------------------------------------------------------

export interface RosTimelineSummary {
  version_id: string
  version_number: number
  status: RosVersionStatus
  total_items: number
  critical_items: number
  has_dependency_cycle: boolean
  first_item_utc?: string
  last_item_utc?: string
}

export function summarizeRosTimeline(
  version: RosVersion,
  items: RosItem[],
): RosTimelineSummary {
  const sorted = [...items].sort((a, b) =>
    a.planned_start_utc.localeCompare(b.planned_start_utc),
  )
  return {
    version_id: version.id,
    version_number: version.version_number,
    status: version.status,
    total_items: items.length,
    critical_items: items.filter((i) => i.is_critical).length,
    has_dependency_cycle: detectDependencyCycle(items) !== null,
    first_item_utc: sorted[0]?.planned_start_utc,
    last_item_utc: sorted[sorted.length - 1]?.planned_end_utc,
  }
}
