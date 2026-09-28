/**
 * EQUIP-305 — Equipment load-in / load-out checklists.
 *
 * Every stop/event has two checklists derived from the published manifest
 * (EQUIP-302) and any venue-advance requirements:
 *
 *   - **Load-in checklist**  – Items that must arrive at the venue before show.
 *   - **Load-out checklist** – Items that must leave the venue after show.
 *
 * Template derivation:
 *   1. Manifest line items generate one checklist entry per line (quantity ≥ 1).
 *   2. Venue advance may add extra entries (e.g. house equipment to inspect).
 *   3. Entries may be merged, overridden, or excluded per-stop.
 *
 * Exception handling:
 *   - Any entry that is NOT checked off (status ≠ "checked") becomes an
 *     *exception* and requires: reason, optional photo evidence reference, and
 *     an assigned responsible person.
 *   - Exceptions remain OPEN until explicitly resolved or the checklist is
 *     closed out. They are NEVER silently auto-closed.
 *   - A checklist may not transition to "closed" while any exception is
 *     unresolved.
 *
 * Closeout:
 *   - Transition: draft → in_progress → ready_for_closeout → closed.
 *   - Closeout is blocked by unresolved exceptions.
 *
 * All helpers are pure (no I/O).
 */

import { type ManifestLineItem } from "@/lib/admin/equipment-manifest"

// ============================================================================
// Checklist types
// ============================================================================

export type ChecklistDirection = "load_in" | "load_out"

export const CHECKLIST_STATUSES = [
  "draft",               // Being built; entries may be added/removed freely.
  "in_progress",         // Checklist is live; actors are checking off items.
  "ready_for_closeout",  // All non-exception items checked; exceptions under review.
  "closed",              // Fully resolved; no unresolved exceptions remain.
] as const
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number]

export const CHECKLIST_STATUS_TRANSITIONS: Record<
  ChecklistStatus,
  readonly ChecklistStatus[]
> = {
  draft:               ["in_progress"],
  in_progress:         ["ready_for_closeout", "draft"],  // back to draft if re-opened
  ready_for_closeout:  ["closed", "in_progress"],
  closed:              [],
}

export function canTransitionChecklistStatus(
  from: ChecklistStatus,
  to: ChecklistStatus,
): boolean {
  if (from === to) return true
  return (CHECKLIST_STATUS_TRANSITIONS[from] as readonly ChecklistStatus[]).includes(to)
}

export class ChecklistStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_checklist_status_transition"
  constructor(from: ChecklistStatus, to: ChecklistStatus) {
    super(`Illegal checklist status transition: ${from} → ${to}`)
    this.name = "ChecklistStatusTransitionError"
  }
}

export function assertChecklistStatusTransition(from: ChecklistStatus, to: ChecklistStatus): void {
  if (!canTransitionChecklistStatus(from, to)) throw new ChecklistStatusTransitionError(from, to)
}

// ============================================================================
// Checklist entry
// ============================================================================

export type EntryStatus =
  | "pending"    // Not yet actioned.
  | "checked"    // Item confirmed present and in acceptable condition.
  | "exception"  // Item could not be checked off; exception details required.
  | "waived"     // Intentionally skipped (e.g. item excluded from this stop).

/** Source that generated this entry. */
export type EntrySourceType =
  | "manifest"       // Derived from a published manifest line item
  | "venue_advance"  // Added from venue advance/rider requirements
  | "manual"         // Added manually by a coordinator on the day

export interface ChecklistEntry {
  id: string
  /** Backref to manifest line, or null for advance/manual entries. */
  manifest_line_item_id: string | null
  source_type: EntrySourceType
  /** Snapshot label (denormalized from catalog/manifest at template build time). */
  label: string
  /** Catalog item or case that this entry covers. */
  catalog_item_id: string | null
  case_id: string | null
  /** Expected quantity to check at this stop. */
  quantity_expected: number
  /** Quantity actually confirmed checked. Null until actioned. */
  quantity_checked: number | null
  status: EntryStatus
  /** UTC ISO when the entry was last actioned. */
  actioned_at_utc: string | null
  /** User who last actioned this entry. */
  actioned_by_user_id: string | null
  /** Required notes (mandatory when status = "exception"). */
  notes: string | null
  /** Reference to a photo/evidence file (required for exceptions; ID in media store). */
  photo_evidence_ref: string | null
  /** User assigned to resolve this exception. Required when status = "exception". */
  exception_assigned_to_user_id: string | null
  exception_assigned_to_name: string | null
  /** UTC ISO when the exception was resolved (null = still open). */
  exception_resolved_at_utc: string | null
  /** Free-text resolution notes. */
  exception_resolution_notes: string | null
}

// ============================================================================
// Checklist
// ============================================================================

export interface EquipmentChecklist {
  id: string
  org_id: string
  tour_id: string
  stop_id: string
  /** manifest_id this checklist was derived from. */
  manifest_id: string | null
  direction: ChecklistDirection
  status: ChecklistStatus
  entries: ChecklistEntry[]
  /** UTC ISO when opened (in_progress transition). */
  opened_at_utc: string | null
  /** UTC ISO when closed. */
  closed_at_utc: string | null
  closed_by_user_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Template derivation
// ============================================================================

export interface VenueAdvanceItem {
  id: string
  label: string
  catalog_item_id: string | null
  case_id: string | null
  quantity: number
  /** Note from the venue advance/rider. */
  advance_notes: string | null
}

/**
 * Build a load-in or load-out checklist draft from a manifest's line items
 * and optional venue advance items.
 *
 * Rules:
 *  - One `ChecklistEntry` per manifest line (source_type = "manifest").
 *  - One additional entry per venue advance item not already covered by a
 *    manifest line (matched by catalog_item_id or case_id; source_type = "venue_advance").
 *  - All entries start as "pending".
 */
export function buildChecklistFromManifest(args: {
  checklistId: string
  orgId: string
  tourId: string
  stopId: string
  manifestId: string
  direction: ChecklistDirection
  manifestLineItems: readonly ManifestLineItem[]
  venueAdvanceItems?: readonly VenueAdvanceItem[]
  createdAt: string
}): EquipmentChecklist {
  const entries: ChecklistEntry[] = []

  // --- 1. Manifest-derived entries ---
  const coveredIds = new Set<string>()
  for (const line of args.manifestLineItems) {
    const entryId = `${args.checklistId}-ml-${line.id}`
    entries.push({
      id: entryId,
      manifest_line_item_id: line.id,
      source_type: "manifest",
      label: line.label,
      catalog_item_id: line.source_type !== "case" ? (line.source_id ?? null) : null,
      case_id: line.source_type === "case" ? (line.source_id ?? null) : null,
      quantity_expected: line.quantity_required,
      quantity_checked: null,
      status: "pending",
      actioned_at_utc: null,
      actioned_by_user_id: null,
      notes: null,
      photo_evidence_ref: null,
      exception_assigned_to_user_id: null,
      exception_assigned_to_name: null,
      exception_resolved_at_utc: null,
      exception_resolution_notes: null,
    })
    if (line.source_id) coveredIds.add(line.source_id)
  }

  // --- 2. Venue advance items not already covered ---
  for (const adv of (args.venueAdvanceItems ?? [])) {
    const alreadyCovered =
      (adv.catalog_item_id && coveredIds.has(adv.catalog_item_id)) ||
      (adv.case_id && coveredIds.has(adv.case_id))
    if (alreadyCovered) continue

    const entryId = `${args.checklistId}-va-${adv.id}`
    entries.push({
      id: entryId,
      manifest_line_item_id: null,
      source_type: "venue_advance",
      label: adv.label,
      catalog_item_id: adv.catalog_item_id,
      case_id: adv.case_id,
      quantity_expected: adv.quantity,
      quantity_checked: null,
      status: "pending",
      actioned_at_utc: null,
      actioned_by_user_id: null,
      notes: adv.advance_notes,
      photo_evidence_ref: null,
      exception_assigned_to_user_id: null,
      exception_assigned_to_name: null,
      exception_resolved_at_utc: null,
      exception_resolution_notes: null,
    })
    if (adv.catalog_item_id) coveredIds.add(adv.catalog_item_id)
    if (adv.case_id) coveredIds.add(adv.case_id)
  }

  return {
    id: args.checklistId,
    org_id: args.orgId,
    tour_id: args.tourId,
    stop_id: args.stopId,
    manifest_id: args.manifestId,
    direction: args.direction,
    status: "draft",
    entries,
    opened_at_utc: null,
    closed_at_utc: null,
    closed_by_user_id: null,
    created_at: args.createdAt,
    updated_at: args.createdAt,
  }
}

// ============================================================================
// Entry mutations
// ============================================================================

/**
 * Mark a checklist entry as checked.
 * Returns a new checklist (immutable).
 */
export function checkEntry(
  checklist: EquipmentChecklist,
  entryId: string,
  args: {
    quantityChecked: number
    actionedByUserId: string
    actionedAtUtc: string
    notes?: string | null
  },
): EquipmentChecklist {
  return {
    ...checklist,
    updated_at: args.actionedAtUtc,
    entries: checklist.entries.map((e) =>
      e.id !== entryId
        ? e
        : {
            ...e,
            status: "checked",
            quantity_checked: args.quantityChecked,
            actioned_by_user_id: args.actionedByUserId,
            actioned_at_utc: args.actionedAtUtc,
            notes: args.notes ?? e.notes,
          },
    ),
  }
}

/**
 * Mark a checklist entry as an exception.
 * `reason` and `assignedToUserId` are REQUIRED (the AC spec mandates both).
 * `photoEvidenceRef` is strongly encouraged but not enforced at this layer
 * (UI enforces upload; API accepts null to support edge cases).
 */
export function raiseException(
  checklist: EquipmentChecklist,
  entryId: string,
  args: {
    reason: string
    assignedToUserId: string
    assignedToName: string
    photoEvidenceRef?: string | null
    actionedByUserId: string
    actionedAtUtc: string
  },
): EquipmentChecklist {
  if (!args.reason.trim()) {
    throw new Error("Exception reason is required and cannot be blank")
  }
  if (!args.assignedToUserId.trim()) {
    throw new Error("Exception must be assigned to a responsible user")
  }

  return {
    ...checklist,
    updated_at: args.actionedAtUtc,
    entries: checklist.entries.map((e) =>
      e.id !== entryId
        ? e
        : {
            ...e,
            status: "exception",
            notes: args.reason,
            photo_evidence_ref: args.photoEvidenceRef ?? null,
            exception_assigned_to_user_id: args.assignedToUserId,
            exception_assigned_to_name: args.assignedToName,
            actioned_by_user_id: args.actionedByUserId,
            actioned_at_utc: args.actionedAtUtc,
            // Exception is NOT resolved — remains open until explicit resolution.
            exception_resolved_at_utc: null,
            exception_resolution_notes: null,
          },
    ),
  }
}

/**
 * Resolve an open exception on a checklist entry.
 * The entry remains "exception" status but is marked resolved (audit trail
 * preserved). Resolution does NOT auto-close the checklist.
 */
export function resolveException(
  checklist: EquipmentChecklist,
  entryId: string,
  args: {
    resolutionNotes: string
    resolvedByUserId: string
    resolvedAtUtc: string
  },
): EquipmentChecklist {
  return {
    ...checklist,
    updated_at: args.resolvedAtUtc,
    entries: checklist.entries.map((e) =>
      e.id !== entryId || e.status !== "exception"
        ? e
        : {
            ...e,
            exception_resolved_at_utc: args.resolvedAtUtc,
            exception_resolution_notes: args.resolutionNotes,
          },
    ),
  }
}

/**
 * Waive a checklist entry (intentionally excluded from this stop).
 */
export function waiveEntry(
  checklist: EquipmentChecklist,
  entryId: string,
  args: { reason: string; actionedByUserId: string; actionedAtUtc: string },
): EquipmentChecklist {
  return {
    ...checklist,
    updated_at: args.actionedAtUtc,
    entries: checklist.entries.map((e) =>
      e.id !== entryId
        ? e
        : {
            ...e,
            status: "waived",
            notes: args.reason,
            actioned_by_user_id: args.actionedByUserId,
            actioned_at_utc: args.actionedAtUtc,
          },
    ),
  }
}

// ============================================================================
// Closeout validation
// ============================================================================

export type CloseoutBlockCode =
  | "unresolved_exceptions"   // One or more exceptions still open
  | "unchecked_required_items"// Required (non-waived) entries still pending
  | "checklist_not_in_progress" // Must be in_progress or ready_for_closeout

export interface CloseoutBlockIssue {
  code: CloseoutBlockCode
  message: string
  entry_ids: string[]
}

export interface CloseoutReadiness {
  ready: boolean
  issues: CloseoutBlockIssue[]
}

/**
 * Check whether a checklist is ready to close.
 * Exceptions must be resolved. All non-waived entries must be checked.
 */
export function evaluateCloseoutReadiness(checklist: EquipmentChecklist): CloseoutReadiness {
  const issues: CloseoutBlockIssue[] = []

  if (checklist.status === "draft" || checklist.status === "closed") {
    issues.push({
      code: "checklist_not_in_progress",
      message: `Checklist is in '${checklist.status}' state; must be in_progress or ready_for_closeout to close`,
      entry_ids: [],
    })
    return { ready: false, issues }
  }

  // Unresolved exceptions (status = "exception" AND exception_resolved_at_utc is null)
  const unresolvedExceptions = checklist.entries.filter(
    (e) => e.status === "exception" && e.exception_resolved_at_utc === null,
  )
  if (unresolvedExceptions.length > 0) {
    issues.push({
      code: "unresolved_exceptions",
      message: `${unresolvedExceptions.length} exception(s) must be resolved before closeout`,
      entry_ids: unresolvedExceptions.map((e) => e.id),
    })
  }

  // Pending entries that have not been actioned
  const pendingRequired = checklist.entries.filter((e) => e.status === "pending")
  if (pendingRequired.length > 0) {
    issues.push({
      code: "unchecked_required_items",
      message: `${pendingRequired.length} item(s) have not been checked or marked`,
      entry_ids: pendingRequired.map((e) => e.id),
    })
  }

  return { ready: issues.length === 0, issues }
}

/**
 * Close a checklist.
 * Throws if closeout readiness check fails (exceptions unresolved or items unchecked).
 */
export function closeChecklist(
  checklist: EquipmentChecklist,
  args: { closedByUserId: string; closedAtUtc: string },
): EquipmentChecklist {
  const readiness = evaluateCloseoutReadiness(checklist)
  if (!readiness.ready) {
    const codes = readiness.issues.map((i) => i.message).join("; ")
    throw new Error(`Checklist cannot be closed: ${codes}`)
  }
  return {
    ...checklist,
    status: "closed",
    closed_at_utc: args.closedAtUtc,
    closed_by_user_id: args.closedByUserId,
    updated_at: args.closedAtUtc,
  }
}

// ============================================================================
// Summary helpers
// ============================================================================

export interface ChecklistSummary {
  total: number
  checked: number
  pending: number
  exceptions: number
  exceptions_unresolved: number
  waived: number
  completion_pct: number   // (checked + waived) / total × 100
  is_closeout_ready: boolean
}

export function buildChecklistSummary(checklist: EquipmentChecklist): ChecklistSummary {
  const { entries } = checklist
  const checked = entries.filter((e) => e.status === "checked").length
  const pending = entries.filter((e) => e.status === "pending").length
  const exceptions = entries.filter((e) => e.status === "exception").length
  const exceptions_unresolved = entries.filter(
    (e) => e.status === "exception" && e.exception_resolved_at_utc === null,
  ).length
  const waived = entries.filter((e) => e.status === "waived").length
  const total = entries.length
  const completion_pct = total > 0 ? Math.round(((checked + waived) / total) * 100) : 0

  return {
    total,
    checked,
    pending,
    exceptions,
    exceptions_unresolved,
    waived,
    completion_pct,
    is_closeout_ready: evaluateCloseoutReadiness(checklist).ready,
  }
}
