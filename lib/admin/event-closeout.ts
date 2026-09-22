/**
 * LIVE-411 — Event closeout.
 *
 * A structured closeout record that tracks completion across all operational
 * domains after the event ends. Covers:
 *
 *  1. Incidents — any open/unresolved incidents
 *  2. Lost/damaged equipment — equipment condition reports
 *  3. Staff exceptions — payroll/hours/conduct flags
 *  4. Attendance — check-in summary vs expected
 *  5. Vendor issues — vendor performance flags
 *  6. Actual timings — planned vs actual summary
 *  7. Documents — outstanding required documents
 *  8. Finance/settlement handoff — trigger for next phase
 *
 * The closeout has a checklist-based lifecycle:
 *   draft → in_review → complete
 * Each domain section has its own status (open / reviewed / signed_off / flagged).
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type CloseoutStatus = "draft" | "in_review" | "complete"

export type SectionStatus = "open" | "reviewed" | "signed_off" | "flagged"

export const CLOSEOUT_SECTIONS = [
  "incidents",
  "equipment",
  "staff_exceptions",
  "attendance",
  "vendor_issues",
  "actual_timings",
  "documents",
  "finance_handoff",
] as const
export type CloseoutSection = (typeof CLOSEOUT_SECTIONS)[number]

// ---------------------------------------------------------------------------
// Section items
// ---------------------------------------------------------------------------

export interface IncidentCloseoutItem {
  incident_id: string
  severity: string
  status: string
  /** True if the incident was resolved before closeout. */
  is_resolved: boolean
  follow_up_required: boolean
}

export interface EquipmentCloseoutItem {
  asset_id: string
  asset_name: string
  condition: "ok" | "damaged" | "lost" | "missing"
  report_id: string | null
  estimated_cost: number | null
}

export interface StaffExceptionItem {
  person_id: string
  exception_type: "overtime" | "no_show" | "early_departure" | "conduct" | "payroll_adjustment"
  description: string
  requires_hr_review: boolean
}

export interface AttendanceSummary {
  expected_count: number
  checked_in_count: number
  denied_count: number
  no_show_count: number
}

export interface VendorIssueItem {
  vendor_id: string
  vendor_name: string
  issue_type: "no_show" | "late" | "quality" | "invoice_dispute" | "damage_claim" | "other"
  description: string
  requires_followup: boolean
}

export interface ActualTimingsSummary {
  on_time_count: number
  late_count: number
  skipped_count: number
  max_delay_minutes: number
}

export interface DocumentCloseoutItem {
  document_type: string
  is_complete: boolean
  notes: string | null
}

export interface FinanceHandoffRecord {
  handed_off_by: string
  handed_off_at: string
  settlement_reference: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Section record
// ---------------------------------------------------------------------------

export interface CloseoutSectionRecord<T> {
  section: CloseoutSection
  status: SectionStatus
  items: T[]
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Closeout record
// ---------------------------------------------------------------------------

export interface EventCloseout {
  closeout_id: string
  org_id: string
  event_id: string
  status: CloseoutStatus

  incidents: CloseoutSectionRecord<IncidentCloseoutItem>
  equipment: CloseoutSectionRecord<EquipmentCloseoutItem>
  staff_exceptions: CloseoutSectionRecord<StaffExceptionItem>
  attendance: CloseoutSectionRecord<AttendanceSummary>
  vendor_issues: CloseoutSectionRecord<VendorIssueItem>
  actual_timings: CloseoutSectionRecord<ActualTimingsSummary>
  documents: CloseoutSectionRecord<DocumentCloseoutItem>
  finance_handoff: CloseoutSectionRecord<FinanceHandoffRecord>

  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function emptySection<T>(section: CloseoutSection): CloseoutSectionRecord<T> {
  return {
    section,
    status: "open",
    items: [],
    reviewed_by: null,
    reviewed_at: null,
    notes: null,
  }
}

export function createEventCloseout(params: {
  closeout_id: string
  org_id: string
  event_id: string
  actor_id: string
  now: string
}): EventCloseout {
  return {
    closeout_id: params.closeout_id,
    org_id: params.org_id,
    event_id: params.event_id,
    status: "draft",
    incidents: emptySection("incidents"),
    equipment: emptySection("equipment"),
    staff_exceptions: emptySection("staff_exceptions"),
    attendance: emptySection("attendance"),
    vendor_issues: emptySection("vendor_issues"),
    actual_timings: emptySection("actual_timings"),
    documents: emptySection("documents"),
    finance_handoff: emptySection("finance_handoff"),
    created_by: params.actor_id,
    created_at: params.now,
    updated_by: params.actor_id,
    updated_at: params.now,
  }
}

// ---------------------------------------------------------------------------
// Section mutations (generic helper)
// ---------------------------------------------------------------------------

type SectionKey = Exclude<CloseoutSection, never>

/** Update a section's items and status. */
export function updateSection<T>(
  closeout: EventCloseout,
  section: SectionKey,
  update: Partial<Pick<CloseoutSectionRecord<T>, "items" | "status" | "notes">>,
  actor: string,
  now: string,
): EventCloseout {
  const existing = closeout[section] as CloseoutSectionRecord<T>
  const updated: CloseoutSectionRecord<T> = { ...existing, ...update }
  return {
    ...closeout,
    [section]: updated,
    updated_by: actor,
    updated_at: now,
  }
}

/** Sign off a section. Requires it to be in "reviewed" status. */
export function signOffSection(
  closeout: EventCloseout,
  section: SectionKey,
  reviewer: string,
  now: string,
): { ok: boolean; closeout: EventCloseout | null; error?: string } {
  const sec = closeout[section] as CloseoutSectionRecord<unknown>
  if (sec.status === "flagged") {
    return { ok: false, closeout: null, error: `Section '${section}' is flagged and cannot be signed off without remediation.` }
  }
  const updated = {
    ...sec,
    status: "signed_off" as SectionStatus,
    reviewed_by: reviewer,
    reviewed_at: now,
  }
  return {
    ok: true,
    closeout: {
      ...closeout,
      [section]: updated,
      updated_by: reviewer,
      updated_at: now,
    },
  }
}

/** Flag a section as requiring attention. */
export function flagSection(
  closeout: EventCloseout,
  section: SectionKey,
  notes: string,
  actor: string,
  now: string,
): EventCloseout {
  const sec = closeout[section] as CloseoutSectionRecord<unknown>
  return {
    ...closeout,
    [section]: { ...sec, status: "flagged", notes },
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Closeout status transitions
// ---------------------------------------------------------------------------

export interface CloseoutTransitionResult {
  ok: boolean
  closeout: EventCloseout | null
  error?: string
  blockers?: string[]
}

/**
 * Advance closeout status.
 *  draft → in_review: always allowed
 *  in_review → complete: blocked if any section is not signed_off
 */
export function transitionCloseout(
  closeout: EventCloseout,
  toStatus: CloseoutStatus,
  actor: string,
  now: string,
): CloseoutTransitionResult {
  const valid: Record<CloseoutStatus, CloseoutStatus[]> = {
    draft: ["in_review"],
    in_review: ["complete", "draft"],
    complete: [],
  }

  if (!valid[closeout.status].includes(toStatus)) {
    return {
      ok: false,
      closeout: null,
      error: `Cannot transition closeout from '${closeout.status}' to '${toStatus}'.`,
    }
  }

  if (toStatus === "complete") {
    const blockers: string[] = []
    for (const section of CLOSEOUT_SECTIONS) {
      const sec = closeout[section] as CloseoutSectionRecord<unknown>
      if (sec.status !== "signed_off") {
        blockers.push(`Section '${section}' is '${sec.status}' (must be signed_off)`)
      }
    }
    if (blockers.length > 0) {
      return { ok: false, closeout: null, blockers, error: "Closeout is incomplete." }
    }
  }

  return {
    ok: true,
    closeout: { ...closeout, status: toStatus, updated_by: actor, updated_at: now },
  }
}

// ---------------------------------------------------------------------------
// Completeness check
// ---------------------------------------------------------------------------

export interface CloseoutCompletenessReport {
  total_sections: number
  signed_off_count: number
  flagged_count: number
  open_count: number
  reviewed_count: number
  can_complete: boolean
  section_statuses: Record<CloseoutSection, SectionStatus>
}

export function computeCloseoutCompleteness(closeout: EventCloseout): CloseoutCompletenessReport {
  let signed_off_count = 0
  let flagged_count = 0
  let open_count = 0
  let reviewed_count = 0

  const section_statuses = {} as Record<CloseoutSection, SectionStatus>

  for (const section of CLOSEOUT_SECTIONS) {
    const sec = closeout[section] as CloseoutSectionRecord<unknown>
    section_statuses[section] = sec.status
    if (sec.status === "signed_off") signed_off_count += 1
    else if (sec.status === "flagged") flagged_count += 1
    else if (sec.status === "open") open_count += 1
    else if (sec.status === "reviewed") reviewed_count += 1
  }

  return {
    total_sections: CLOSEOUT_SECTIONS.length,
    signed_off_count,
    flagged_count,
    open_count,
    reviewed_count,
    can_complete: signed_off_count === CLOSEOUT_SECTIONS.length,
    section_statuses,
  }
}

// ---------------------------------------------------------------------------
// Finance handoff helper
// ---------------------------------------------------------------------------

export function recordFinanceHandoff(
  closeout: EventCloseout,
  handoff: FinanceHandoffRecord,
): EventCloseout {
  const sec = closeout.finance_handoff
  return {
    ...closeout,
    finance_handoff: {
      ...sec,
      items: [...sec.items, handoff],
      status: "reviewed",
    },
    updated_by: handoff.handed_off_by,
    updated_at: handoff.handed_off_at,
  }
}
