/**
 * EQUIP-306 — Equipment damage, loss, and service workflow.
 *
 * Three domain models:
 *
 * 1. **DamageLossReport**  — Filed when an item is found damaged or lost.
 *    Carries severity, evidence references (secure tokens — never raw URLs),
 *    custody chain snapshot, owner, and links to vendor/insurance/finance
 *    records.  Resolution paths: repaired, written-off, replaced.
 *
 * 2. **ServiceEvent**      — Planned or reactive maintenance/repair record.
 *    Triggered by a DamageLossReport or by the calendar service-due date
 *    (EQUIP-301).  Tracks service provider, cost, parts, and completion.
 *
 * 3. **ServiceHistory**    — Read-model: ordered list of all service events
 *    for an item, plus aggregate statistics for closeout / insurance export.
 *
 * Evidence security:
 *    Evidence files are never stored as raw URLs.  Each `EvidenceRef` carries
 *    an opaque `evidence_token` that the media/storage service resolves to a
 *    signed, time-limited URL.  This module only models the token reference.
 *
 * All helpers are pure (no I/O).
 */

import {
  type EquipmentAssetStatus,
  assertAssetStatusTransition,
} from "@/lib/admin/equipment-catalog"
import { type ConditionRating } from "@/lib/admin/equipment-custody"

// ============================================================================
// Shared enumerations
// ============================================================================

export const DAMAGE_SEVERITIES = [
  "cosmetic",      // Surface scratches, dents — does not affect function.
  "functional",    // Affects operation; still usable with limitations.
  "critical",      // Non-functional; must be repaired or replaced before use.
  "total_loss",    // Beyond economic repair; must be written off.
] as const
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number]

export const LOSS_TYPES = [
  "theft",         // Reported stolen.
  "missing",       // Cannot be located; cause unknown.
  "destroyed",     // Physically destroyed (fire, flood, etc.).
] as const
export type LossType = (typeof LOSS_TYPES)[number]

// ============================================================================
// Secure evidence reference
// ============================================================================

/**
 * Opaque token reference to an evidence file in the media/storage service.
 * Callers present `evidence_token` to the storage API to get a signed URL.
 * Raw URLs or file paths must never be stored in this record.
 */
export interface EvidenceRef {
  /** Opaque token — resolved to a signed URL by the media service. */
  evidence_token: string
  /** MIME type of the evidence file. */
  mime_type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "application/pdf"
  /** Human label (e.g. "Impact photo — rear panel"). */
  label: string | null
  /** UTC ISO when the evidence file was uploaded. */
  uploaded_at_utc: string
  uploaded_by_user_id: string
}

// ============================================================================
// PART 1 — Damage / Loss Report
// ============================================================================

export const DAMAGE_REPORT_STATUSES = [
  "open",           // Filed; under initial assessment.
  "under_review",   // Being assessed by owner/vendor/insurer.
  "resolved",       // Fully resolved (repaired, replaced, or written off).
  "disputed",       // Ownership or liability contested.
  "closed",         // No further action; archived.
] as const
export type DamageReportStatus = (typeof DAMAGE_REPORT_STATUSES)[number]

export const DAMAGE_REPORT_TRANSITIONS: Record<
  DamageReportStatus,
  readonly DamageReportStatus[]
> = {
  open:         ["under_review", "resolved", "closed", "disputed"],
  under_review: ["resolved", "disputed", "open"],   // back to open if new info
  resolved:     ["closed"],
  disputed:     ["under_review", "resolved", "closed"],
  closed:       [],
}

export function canTransitionDamageReportStatus(
  from: DamageReportStatus,
  to: DamageReportStatus,
): boolean {
  if (from === to) return true
  return (DAMAGE_REPORT_TRANSITIONS[from] as readonly DamageReportStatus[]).includes(to)
}

export class DamageReportTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_damage_report_status_transition"
  constructor(from: DamageReportStatus, to: DamageReportStatus) {
    super(`Illegal damage report status transition: ${from} → ${to}`)
    this.name = "DamageReportTransitionError"
  }
}

export function assertDamageReportTransition(
  from: DamageReportStatus,
  to: DamageReportStatus,
): void {
  if (!canTransitionDamageReportStatus(from, to))
    throw new DamageReportTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Resolution record
// ---------------------------------------------------------------------------

export type ResolutionOutcome =
  | "repaired"          // Item fixed and returned to service.
  | "replaced"          // Item replaced with a new/equivalent unit.
  | "written_off"       // Deemed beyond repair; retired from inventory.
  | "returned_to_vendor" // Vendor-supplied item returned under warranty/agreement.
  | "insurance_claim"   // Insurance claim filed; final disposition pending.
  | "no_action"         // Resolved with no physical action (e.g. false report).

export interface DamageReportResolution {
  outcome: ResolutionOutcome
  resolved_by_user_id: string
  resolved_at_utc: string
  resolution_notes: string
  /** If replaced: the catalog_item_id of the replacement asset. */
  replacement_catalog_item_id: string | null
  /** If insurance claim: claim reference number. */
  insurance_claim_ref: string | null
  /** If routed to finance: linked finance record ID. */
  finance_record_id: string | null
}

// ---------------------------------------------------------------------------
// Damage / loss report
// ---------------------------------------------------------------------------

export interface DamageLossReport {
  id: string
  org_id: string
  tour_id: string

  // What was damaged/lost
  catalog_item_id: string | null
  case_id: string | null
  /** Denormalized label at time of report. */
  item_label: string

  // Classification
  /** "damage" when the item exists but is impaired; "loss" when missing/stolen. */
  report_type: "damage" | "loss"
  severity: DamageSeverity | null        // null for loss reports
  loss_type: LossType | null             // null for damage reports
  condition_at_report: ConditionRating

  // Description
  description: string
  /** Location where damage/loss occurred (stop/venue label). */
  incident_location: string | null
  /** UTC ISO of the incident (may differ from report time). */
  incident_at_utc: string | null

  // Evidence (secure references only — never raw URLs)
  evidence: EvidenceRef[]

  // Custody chain snapshot (IDs only; full chain via EQUIP-304)
  /** The custody_event_id that first recorded the condition change. */
  triggering_custody_event_id: string | null
  /** User who had custody when damage/loss occurred. */
  custody_holder_at_incident_id: string | null
  custody_holder_at_incident_name: string | null

  // Ownership / responsibility
  /** Internal user responsible for this report's resolution. */
  owner_user_id: string
  owner_user_name: string

  // External links (populated as investigation proceeds)
  /** Vendor ID when damage involves a vendor-supplied or rented item. */
  vendor_id: string | null
  /** Reference to insurance policy/claim record. */
  insurance_policy_ref: string | null
  insurance_claim_ref: string | null
  /** Finance record for repair cost, deductible, write-off. */
  finance_record_id: string | null

  // Service link
  /** service_event_id if a repair/service was triggered. */
  service_event_id: string | null

  status: DamageReportStatus
  resolution: DamageReportResolution | null

  // Catalog status change (set when report changes operational status of asset)
  previous_asset_status: EquipmentAssetStatus | null
  new_asset_status: EquipmentAssetStatus | null

  reported_by_user_id: string
  reported_at_utc: string
  updated_at_utc: string
}

// ---------------------------------------------------------------------------
// Report mutation helpers
// ---------------------------------------------------------------------------

/** Attach a secure evidence reference to an open report (immutable). */
export function attachEvidence(
  report: DamageLossReport,
  ref: EvidenceRef,
  updatedAt: string,
): DamageLossReport {
  if (report.status === "closed") {
    throw new Error(`Evidence cannot be added to a closed report (${report.id})`)
  }
  return {
    ...report,
    evidence: [...report.evidence, ref],
    updated_at_utc: updatedAt,
  }
}

/**
 * Resolve a damage/loss report.
 * Validates that a description and outcome are present.
 * Optionally stamps a new asset status on the catalog item (caller applies to catalog).
 */
export function resolveReport(
  report: DamageLossReport,
  resolution: DamageReportResolution,
  newAssetStatus: EquipmentAssetStatus | null,
): DamageLossReport {
  if (report.status === "closed" || report.status === "resolved") {
    throw new Error(`Report '${report.id}' is already ${report.status}`)
  }
  if (!resolution.resolution_notes.trim()) {
    throw new Error("Resolution notes are required")
  }
  // Note: catalog-status transition validation is the caller's responsibility
  // when applying the status change to the catalog record. The report only
  // stamps what the post-resolution status should be; it does not run the
  // full state-machine check here (the report's new_asset_status may be
  // overridden by the caller who resolves against the live catalog state).
  return {
    ...report,
    status: "resolved",
    resolution,
    new_asset_status: newAssetStatus,
    updated_at_utc: resolution.resolved_at_utc,
  }
}

// ============================================================================
// PART 2 — Service event
// ============================================================================

export const SERVICE_EVENT_TYPES = [
  "scheduled_maintenance", // Calendar-driven (service_due_date from EQUIP-301)
  "reactive_repair",       // Triggered by a DamageLossReport
  "inspection",            // Formal condition inspection (no repair)
  "calibration",           // Calibration/tuning (audio/lighting/video)
  "cleaning",              // Deep clean / refurbishment
  "vendor_service",        // Sent to manufacturer or authorized service center
] as const
export type ServiceEventType = (typeof SERVICE_EVENT_TYPES)[number]

export const SERVICE_EVENT_STATUSES = [
  "scheduled",    // Booked; not yet started.
  "in_progress",  // Currently being serviced.
  "awaiting_parts", // Waiting for parts/materials.
  "completed",    // Service done; returned to operational status.
  "cancelled",    // Service cancelled.
] as const
export type ServiceEventStatus = (typeof SERVICE_EVENT_STATUSES)[number]

export const SERVICE_STATUS_TRANSITIONS: Record<
  ServiceEventStatus,
  readonly ServiceEventStatus[]
> = {
  scheduled:       ["in_progress", "cancelled"],
  in_progress:     ["awaiting_parts", "completed", "cancelled"],
  awaiting_parts:  ["in_progress", "cancelled"],
  completed:       [],
  cancelled:       ["scheduled"],  // re-schedule after cancel
}

export function canTransitionServiceStatus(
  from: ServiceEventStatus,
  to: ServiceEventStatus,
): boolean {
  if (from === to) return true
  return (SERVICE_STATUS_TRANSITIONS[from] as readonly ServiceEventStatus[]).includes(to)
}

export class ServiceStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_service_status_transition"
  constructor(from: ServiceEventStatus, to: ServiceEventStatus) {
    super(`Illegal service event status transition: ${from} → ${to}`)
    this.name = "ServiceStatusTransitionError"
  }
}

export function assertServiceStatusTransition(
  from: ServiceEventStatus,
  to: ServiceEventStatus,
): void {
  if (!canTransitionServiceStatus(from, to))
    throw new ServiceStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Service event record
// ---------------------------------------------------------------------------

export interface ServiceEventPart {
  description: string
  quantity: number
  unit_cost: number | null
  currency: string
}

export interface ServiceEvent {
  id: string
  org_id: string
  tour_id: string | null  // null for off-tour maintenance

  catalog_item_id: string | null
  case_id: string | null
  item_label: string

  service_type: ServiceEventType
  status: ServiceEventStatus

  /** Triggered by a damage/loss report. */
  damage_report_id: string | null
  /** Service provider name or vendor ID. */
  service_provider: string | null
  service_provider_vendor_id: string | null

  /** ISO date scheduled. */
  scheduled_date: string | null
  /** UTC ISO when service actually began. */
  started_at_utc: string | null
  /** UTC ISO when service was completed. */
  completed_at_utc: string | null

  description: string
  findings: string | null
  parts_used: ServiceEventPart[]

  // Costs (finance-gated on projection)
  labor_cost: number | null
  total_parts_cost: number | null
  currency: string
  /** Finance record capturing the service cost. */
  finance_record_id: string | null

  // Evidence
  evidence: EvidenceRef[]

  // Post-service asset status
  post_service_asset_status: EquipmentAssetStatus | null
  /** Updated service_due_date after this service (ISO YYYY-MM-DD). */
  next_service_due_date: string | null

  created_by_user_id: string
  created_at_utc: string
  updated_at_utc: string
}

// ---------------------------------------------------------------------------
// Service event helpers
// ---------------------------------------------------------------------------

/** Compute total cost from labor + parts (pure). */
export function computeServiceCost(event: ServiceEvent): number {
  const parts = event.parts_used.reduce(
    (sum, p) => sum + (p.unit_cost ?? 0) * p.quantity,
    0,
  )
  return (event.labor_cost ?? 0) + parts
}

/** Mark a service event complete. Sets completed_at and optional next service date. */
export function completeServiceEvent(
  event: ServiceEvent,
  args: {
    findings: string
    completedAtUtc: string
    postServiceAssetStatus: EquipmentAssetStatus | null
    nextServiceDueDate: string | null
  },
): ServiceEvent {
  assertServiceStatusTransition(event.status, "completed")
  return {
    ...event,
    status: "completed",
    findings: args.findings,
    completed_at_utc: args.completedAtUtc,
    post_service_asset_status: args.postServiceAssetStatus,
    next_service_due_date: args.nextServiceDueDate,
    updated_at_utc: args.completedAtUtc,
  }
}

// ============================================================================
// PART 3 — Service history (read-model)
// ============================================================================

export interface ServiceHistoryEntry {
  service_event_id: string
  service_type: ServiceEventType
  status: ServiceEventStatus
  service_provider: string | null
  scheduled_date: string | null
  completed_at_utc: string | null
  findings: string | null
  total_cost: number
  currency: string
  triggered_by_report_id: string | null
}

export interface ServiceHistory {
  catalog_item_id: string | null
  case_id: string | null
  item_label: string
  entries: ServiceHistoryEntry[]
  total_service_events: number
  completed_service_events: number
  total_cost_all_time: number
  /** ISO YYYY-MM-DD of most recent completed service. */
  last_serviced_date: string | null
  /** Computed next service due date from most recent completed event. */
  next_service_due_date: string | null
  has_open_damage_reports: boolean
}

/**
 * Build a service history read-model from events and open report flag.
 * `events` must be sorted by scheduled_date ascending.
 */
export function buildServiceHistory(
  itemId: string,
  isCase: boolean,
  itemLabel: string,
  events: readonly ServiceEvent[],
  hasOpenDamageReports: boolean,
): ServiceHistory {
  const relevant = events.filter((e) =>
    isCase ? e.case_id === itemId : e.catalog_item_id === itemId,
  )

  const entries: ServiceHistoryEntry[] = relevant.map((e) => ({
    service_event_id: e.id,
    service_type: e.service_type,
    status: e.status,
    service_provider: e.service_provider,
    scheduled_date: e.scheduled_date,
    completed_at_utc: e.completed_at_utc,
    findings: e.findings,
    total_cost: computeServiceCost(e),
    currency: e.currency,
    triggered_by_report_id: e.damage_report_id,
  }))

  const completed = relevant.filter((e) => e.status === "completed")
  const lastCompleted = completed[completed.length - 1] ?? null
  const totalCost = entries.reduce((sum, e) => sum + e.total_cost, 0)

  return {
    catalog_item_id: isCase ? null : itemId,
    case_id: isCase ? itemId : null,
    item_label: itemLabel,
    entries,
    total_service_events: relevant.length,
    completed_service_events: completed.length,
    total_cost_all_time: totalCost,
    last_serviced_date: lastCompleted?.scheduled_date ?? null,
    next_service_due_date: lastCompleted?.next_service_due_date ?? null,
    has_open_damage_reports: hasOpenDamageReports,
  }
}

// ============================================================================
// Cross-domain summary (for dashboard / report tile)
// ============================================================================

export interface EquipmentIncidentSummary {
  open_damage_reports: number
  open_loss_reports: number
  critical_severity_count: number
  unresolved_insurance_claims: number
  pending_service_events: number
  items_in_service: number  // catalog items currently in_service or damaged status
}

export function buildIncidentSummary(
  reports: readonly DamageLossReport[],
  serviceEvents: readonly ServiceEvent[],
): EquipmentIncidentSummary {
  const open_damage_reports = reports.filter(
    (r) => r.report_type === "damage" && r.status !== "closed" && r.status !== "resolved",
  ).length

  const open_loss_reports = reports.filter(
    (r) => r.report_type === "loss" && r.status !== "closed" && r.status !== "resolved",
  ).length

  const critical_severity_count = reports.filter(
    (r) => (r.severity === "critical" || r.severity === "total_loss") && r.status !== "closed",
  ).length

  const unresolved_insurance_claims = reports.filter(
    (r) => r.insurance_claim_ref != null && r.status !== "closed" && r.status !== "resolved",
  ).length

  const pending_service_events = serviceEvents.filter(
    (e) => e.status === "scheduled" || e.status === "in_progress" || e.status === "awaiting_parts",
  ).length

  const items_in_service = new Set(
    reports
      .filter((r) => r.new_asset_status === "in_service" || r.new_asset_status === "damaged")
      .map((r) => r.catalog_item_id ?? r.case_id)
      .filter(Boolean),
  ).size

  return {
    open_damage_reports,
    open_loss_reports,
    critical_severity_count,
    unresolved_insurance_claims,
    pending_service_events,
    items_in_service,
  }
}
