/**
 * WORK-407 — Schedule templates (pure).
 *
 * Versioned, organization-owned templates derive work calls from event
 * milestones (e.g. doors, show, load-out) or from fixed local times.
 * A template is applied to a concrete date/context through:
 *   - `previewScheduleTemplate` — returns prospective shifts, unresolved roles,
 *     conflicts with existing shifts, and estimated cost per shift
 *   - `applyScheduleTemplate` — blocked when hard conflicts exist unless overridden
 *
 * Template status lifecycle: draft → published → archived
 * (matches WORK-403 role-template pattern)
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleTemplateStatus = "draft" | "published" | "archived"

/** The anchor by which a shift start is computed. */
export type TemplateAnchorType =
  | "fixed_local_time"     // explicit HH:MM local time
  | "milestone_offset"     // offset (minutes) from a named milestone

/** A single shift definition within a template. */
export interface TemplateShiftDefinition {
  slot_id: string
  /** Display name for this call/position (e.g. "Load In – Stage", "Doors"). */
  role_label: string
  department: string
  /** Column type — aligns with StaffingColumnType from WORK-402. */
  column_type: "show" | "travel" | "rehearsal" | "warehouse" | "other"
  anchor_type: TemplateAnchorType
  /** When anchor_type=fixed_local_time: "HH:MM" in local time. */
  fixed_local_time?: string | null
  /** When anchor_type=milestone_offset: name of milestone (e.g. "doors"). */
  milestone_name?: string | null
  /** Offset in minutes from milestone (positive = after, negative = before). */
  milestone_offset_minutes?: number | null
  /** Duration of shift in minutes. */
  duration_minutes: number
  /** Minimum number of people required in this slot. */
  headcount_required: number
  /** Whether missing headcount blocks template application. */
  is_required: boolean
  /** Optional skill/credential tags for this slot. */
  skill_tags?: string[]
  /** Approximate hourly rate for cost estimate (null = unknown). */
  estimated_rate_per_hour?: number | null
  /** Currency for rate. */
  rate_currency?: string | null
}

/** A versioned schedule template owned by an org. */
export interface ScheduleTemplate {
  template_id: string
  org_id: string
  name: string
  description?: string | null
  /** Event type this template is best suited for. */
  event_type?: string | null
  status: ScheduleTemplateStatus
  /** Semantic version (incremented on every published change). */
  version: number
  shifts: TemplateShiftDefinition[]
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Template application context
// ---------------------------------------------------------------------------

/** Named milestones supplied when applying a template (e.g. from advancing sheet). */
export type MilestoneMap = Record<string, string> // milestone_name → ISO datetime (local-wall)

/** An existing shift that may conflict with template-generated shifts. */
export interface ExistingShiftRecord {
  shift_id: string
  person_id?: string | null
  role_label: string
  department: string
  start_local: string  // ISO datetime (local-wall)
  end_local: string
  is_locked: boolean
}

// ---------------------------------------------------------------------------
// Preview output types
// ---------------------------------------------------------------------------

export type TemplatePreviewShiftStatus =
  | "new"               // no conflict, will be created
  | "conflict"          // overlaps an existing (non-locked) shift
  | "locked_conflict"   // overlaps a locked shift (hard block)
  | "unresolved_role"   // required slot with no anchor time (missing milestone)

export interface TemplatePreviewShift {
  slot_id: string
  role_label: string
  department: string
  column_type: TemplateShiftDefinition["column_type"]
  status: TemplatePreviewShiftStatus
  /** Resolved start time (ISO local-wall). Null when anchor cannot be resolved. */
  start_local: string | null
  end_local: string | null
  headcount_required: number
  is_required: boolean
  skill_tags: string[]
  estimated_cost: number | null
  rate_currency: string | null
  /** IDs of conflicting existing shifts. */
  conflict_shift_ids: string[]
  /** Human-readable reason for unresolved status. */
  unresolved_reason?: string | null
}

export interface ScheduleTemplatePreview {
  template_id: string
  template_version: number
  date: string   // YYYY-MM-DD application date
  shifts: TemplatePreviewShift[]
  /** Count of required slots that are unresolved (cannot produce a shift time). */
  unresolved_required_count: number
  /** Count of hard (locked) conflicts. */
  hard_conflict_count: number
  /** Count of soft (non-locked) conflicts. */
  soft_conflict_count: number
  /** Total estimated cost across all new/soft-conflict shifts. Null when any rate unknown. */
  estimated_total_cost: number | null
  currency: string | null
  /** True when there are no hard conflicts and all required slots are resolved. */
  can_apply: boolean
}

// ---------------------------------------------------------------------------
// Apply output types
// ---------------------------------------------------------------------------

export type TemplateApplyItemResult = "created" | "skipped_locked" | "skipped_conflict" | "skipped_unresolved"

export interface TemplateApplyItem {
  slot_id: string
  role_label: string
  result: TemplateApplyItemResult
  start_local: string | null
  end_local: string | null
  detail?: string | null
}

export interface ScheduleTemplateApplyResult {
  template_id: string
  date: string
  items: TemplateApplyItem[]
  created_count: number
  skipped_count: number
  /** True when all required slots produced a created shift. */
  complete: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse "HH:MM" into minutes since midnight.
 * Returns null for malformed input.
 */
export function parseLocalTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Build an ISO local-wall datetime from a date string and minutes-since-midnight. */
export function buildLocalDatetime(date: string, minutesSinceMidnight: number): string {
  const h = Math.floor(minutesSinceMidnight / 60)
  const m = minutesSinceMidnight % 60
  return `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
}

/** Add `minutes` to an ISO local-wall datetime string (no timezone interpretation). */
export function addMinutesToLocalDatetime(isoLocal: string, minutes: number): string {
  // Parse parts directly — avoids UTC/local interpretation by Date constructor
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(isoLocal)
  if (!m) return isoLocal
  const totalMinutes =
    parseInt(m[4], 10) * 60 +
    parseInt(m[5], 10) +
    minutes
  // Convert absolute day-minutes back using UTC math
  const dateMs =
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) +
    totalMinutes * 60_000
  const d = new Date(dateMs)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  const ss = String(d.getUTCSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}`
}

/** True when two [start, end) intervals overlap. */
export function localTimesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

// ---------------------------------------------------------------------------
// Resolve a single slot's start time
// ---------------------------------------------------------------------------

function resolveSlotStart(
  slot: TemplateShiftDefinition,
  date: string,
  milestones: MilestoneMap,
): { start: string; reason: string | null } {
  if (slot.anchor_type === "fixed_local_time") {
    if (!slot.fixed_local_time) return { start: "", reason: "fixed_local_time anchor missing time value" }
    const mins = parseLocalTime(slot.fixed_local_time)
    if (mins === null) return { start: "", reason: `Cannot parse fixed_local_time '${slot.fixed_local_time}'` }
    return { start: buildLocalDatetime(date, mins), reason: null }
  }

  // milestone_offset
  const msName = slot.milestone_name
  if (!msName) return { start: "", reason: "milestone_offset anchor missing milestone_name" }
  const anchor = milestones[msName]
  if (!anchor) return { start: "", reason: `Milestone '${msName}' not provided` }
  const offset = slot.milestone_offset_minutes ?? 0
  return { start: addMinutesToLocalDatetime(anchor, offset), reason: null }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

export function previewScheduleTemplate(args: {
  template: ScheduleTemplate
  date: string
  milestones: MilestoneMap
  existingShifts: ExistingShiftRecord[]
}): ScheduleTemplatePreview {
  const { template, date, milestones, existingShifts } = args

  const previewShifts: TemplatePreviewShift[] = []
  let hardConflictCount = 0
  let softConflictCount = 0
  let unresolvedRequiredCount = 0
  const costs: Array<number | null> = []

  for (const slot of template.shifts) {
    const { start: startLocal, reason } = resolveSlotStart(slot, date, milestones)

    if (reason || !startLocal) {
      if (slot.is_required) unresolvedRequiredCount++
      previewShifts.push({
        slot_id: slot.slot_id,
        role_label: slot.role_label,
        department: slot.department,
        column_type: slot.column_type,
        status: "unresolved_role",
        start_local: null,
        end_local: null,
        headcount_required: slot.headcount_required,
        is_required: slot.is_required,
        skill_tags: slot.skill_tags ?? [],
        estimated_cost: null,
        rate_currency: null,
        conflict_shift_ids: [],
        unresolved_reason: reason,
      })
      continue
    }

    const endLocal = addMinutesToLocalDatetime(startLocal, slot.duration_minutes)

    // Check for conflicts
    const lockedConflicts = existingShifts.filter(
      (s) => s.is_locked && localTimesOverlap(startLocal, endLocal, s.start_local, s.end_local),
    )
    const softConflicts = existingShifts.filter(
      (s) => !s.is_locked && localTimesOverlap(startLocal, endLocal, s.start_local, s.end_local),
    )

    let shiftStatus: TemplatePreviewShiftStatus = "new"
    if (lockedConflicts.length > 0) {
      shiftStatus = "locked_conflict"
      hardConflictCount++
    } else if (softConflicts.length > 0) {
      shiftStatus = "conflict"
      softConflictCount++
    }

    // Estimated cost
    let estCost: number | null = null
    if (slot.estimated_rate_per_hour != null) {
      estCost = (slot.duration_minutes / 60) * slot.estimated_rate_per_hour * slot.headcount_required
    }
    costs.push(estCost)

    previewShifts.push({
      slot_id: slot.slot_id,
      role_label: slot.role_label,
      department: slot.department,
      column_type: slot.column_type,
      status: shiftStatus,
      start_local: startLocal,
      end_local: endLocal,
      headcount_required: slot.headcount_required,
      is_required: slot.is_required,
      skill_tags: slot.skill_tags ?? [],
      estimated_cost: estCost,
      rate_currency: slot.rate_currency ?? null,
      conflict_shift_ids: [
        ...lockedConflicts.map((s) => s.shift_id),
        ...softConflicts.map((s) => s.shift_id),
      ],
    })
  }

  // Total cost — null if any resolved shift has unknown rate
  const resolvedCosts = costs
  const hasUnknownRate = resolvedCosts.some((c) => c === null)
  const estimatedTotal = hasUnknownRate
    ? null
    : resolvedCosts.reduce<number>((acc, c) => acc + (c ?? 0), 0)

  // Currency: use first rate_currency found across slots (or null)
  const currency = template.shifts.find((s) => s.rate_currency)?.rate_currency ?? null

  const canApply = unresolvedRequiredCount === 0 && hardConflictCount === 0

  return {
    template_id: template.template_id,
    template_version: template.version,
    date,
    shifts: previewShifts,
    unresolved_required_count: unresolvedRequiredCount,
    hard_conflict_count: hardConflictCount,
    soft_conflict_count: softConflictCount,
    estimated_total_cost: estimatedTotal,
    currency,
    can_apply: canApply,
  }
}

export function applyScheduleTemplate(args: {
  template: ScheduleTemplate
  date: string
  milestones: MilestoneMap
  existingShifts: ExistingShiftRecord[]
  /** When true, soft conflicts are overridden (still created). */
  override_soft_conflicts?: boolean
}): ScheduleTemplateApplyResult {
  const preview = previewScheduleTemplate(args)

  const items: TemplateApplyItem[] = preview.shifts.map((ps) => {
    if (ps.status === "unresolved_role") {
      return {
        slot_id: ps.slot_id,
        role_label: ps.role_label,
        result: "skipped_unresolved" as const,
        start_local: null,
        end_local: null,
        detail: ps.unresolved_reason ?? "Cannot resolve start time",
      }
    }
    if (ps.status === "locked_conflict") {
      return {
        slot_id: ps.slot_id,
        role_label: ps.role_label,
        result: "skipped_locked" as const,
        start_local: ps.start_local,
        end_local: ps.end_local,
        detail: `Locked shift conflict: ${ps.conflict_shift_ids.join(", ")}`,
      }
    }
    if (ps.status === "conflict" && !args.override_soft_conflicts) {
      return {
        slot_id: ps.slot_id,
        role_label: ps.role_label,
        result: "skipped_conflict" as const,
        start_local: ps.start_local,
        end_local: ps.end_local,
        detail: `Soft conflict with: ${ps.conflict_shift_ids.join(", ")}`,
      }
    }
    // "new" or overridden "conflict"
    return {
      slot_id: ps.slot_id,
      role_label: ps.role_label,
      result: "created" as const,
      start_local: ps.start_local,
      end_local: ps.end_local,
    }
  })

  const createdCount = items.filter((i) => i.result === "created").length
  const skippedCount = items.filter((i) => i.result !== "created").length

  // "complete" = all required slots were created
  const requiredSlotIds = new Set(
    args.template.shifts.filter((s) => s.is_required).map((s) => s.slot_id),
  )
  const createdSlotIds = new Set(items.filter((i) => i.result === "created").map((i) => i.slot_id))
  const complete = [...requiredSlotIds].every((id) => createdSlotIds.has(id))

  return {
    template_id: args.template.template_id,
    date: args.date,
    items,
    created_count: createdCount,
    skipped_count: skippedCount,
    complete,
  }
}
