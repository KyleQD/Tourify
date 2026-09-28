/**
 * LIVE-405 — Add day-sheet correction workflow
 *
 * When a published day sheet needs correction, the workflow:
 *
 *   1. Author drafts a correction (DaySheetCorrection) describing what changed
 *      and assessing impact severity.
 *   2. For critical changes, a CriticalChangeImpact is computed, listing
 *      which recipients are affected and what must be re-acknowledged.
 *   3. A new DaySheetPublication is triggered (supersedes the old one).
 *   4. The superseded publication is visibly marked (status = "superseded")
 *      and its old acknowledgements are invalidated.
 *   5. Affected recipients must re-acknowledge the corrected version.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { DaySheetPublication } from "./day-sheet-publication"
import { supersedePublication } from "./day-sheet-publication"

// ---------------------------------------------------------------------------
// Correction severity
// ---------------------------------------------------------------------------

export type CorrectionSeverity =
  | "informational"   // cosmetic / no operational impact; no re-ack required
  | "moderate"        // meaningful change; re-ack recommended
  | "critical"        // time, location, safety, or travel changed; re-ack required

// ---------------------------------------------------------------------------
// Changed domain — what part of the day sheet changed
// ---------------------------------------------------------------------------

export type CorrectedDomain =
  | "ros_item"         // timeline item time/location/role changed
  | "travel"           // departure/arrival details changed
  | "lodging"          // hotel/room changed
  | "call_shift"       // work call time/location changed
  | "meal"             // meal window/location changed
  | "contact"          // contact name/phone changed
  | "map"              // site map reference changed
  | "emergency"        // emergency contact changed
  | "weather"          // weather update

// ---------------------------------------------------------------------------
// Correction record
// ---------------------------------------------------------------------------

export type CorrectionStatus =
  | "draft"
  | "approved"
  | "superseded_publication"   // correction was applied; old pub superseded
  | "cancelled"

export interface DaySheetCorrection {
  id: string
  org_id: string
  event_id: string
  publication_id: string          // the publication being corrected

  status: CorrectionStatus
  severity: CorrectionSeverity

  changed_domains: CorrectedDomain[]
  summary: string                 // human-readable description of the change
  detailed_notes?: string

  requires_reack: boolean         // computed from severity >= critical
  /** IDs of recipients who must re-acknowledge */
  reack_required_user_ids: string[]

  authored_by: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Impact assessment
// ---------------------------------------------------------------------------

export interface CriticalChangeImpact {
  severity: CorrectionSeverity
  requires_reack: boolean
  affected_user_ids: string[]
  changed_domains: CorrectedDomain[]
  reasons: string[]
}

// ---------------------------------------------------------------------------
// Determine impact from a set of changed domains
// ---------------------------------------------------------------------------

const CRITICAL_DOMAINS: Set<CorrectedDomain> = new Set([
  "ros_item",     // time/location changes
  "travel",       // travel details are operationally critical
  "emergency",    // safety-critical
  "call_shift",   // work call changes affect show timing
])

const MODERATE_DOMAINS: Set<CorrectedDomain> = new Set([
  "lodging", "contact", "meal",
])

export function assessCorrectionImpact(
  changedDomains: CorrectedDomain[],
  affectedUserIds: string[],
): CriticalChangeImpact {
  const reasons: string[] = []
  let severity: CorrectionSeverity = "informational"

  for (const domain of changedDomains) {
    if (CRITICAL_DOMAINS.has(domain)) {
      severity = "critical"
      reasons.push(`${domain} changes are operationally critical.`)
    } else if (MODERATE_DOMAINS.has(domain) && severity !== "critical") {
      severity = "moderate"
      reasons.push(`${domain} changes require attention.`)
    }
  }

  return {
    severity,
    requires_reack: severity === "critical",
    affected_user_ids: affectedUserIds,
    changed_domains: changedDomains,
    reasons,
  }
}

// ---------------------------------------------------------------------------
// Create a correction record
// ---------------------------------------------------------------------------

export function createCorrection(input: {
  id: string
  org_id: string
  event_id: string
  publication_id: string
  changed_domains: CorrectedDomain[]
  summary: string
  detailed_notes?: string
  all_recipient_ids: string[]
  authored_by: string
  now?: string
}): DaySheetCorrection {
  const ts = input.now ?? new Date().toISOString()
  const impact = assessCorrectionImpact(input.changed_domains, input.all_recipient_ids)

  return {
    id: input.id,
    org_id: input.org_id,
    event_id: input.event_id,
    publication_id: input.publication_id,
    status: "draft",
    severity: impact.severity,
    changed_domains: input.changed_domains,
    summary: input.summary,
    detailed_notes: input.detailed_notes,
    requires_reack: impact.requires_reack,
    reack_required_user_ids: impact.requires_reack ? input.all_recipient_ids : [],
    authored_by: input.authored_by,
    created_at: ts,
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Approve a correction
// ---------------------------------------------------------------------------

export function approveCorrection(
  correction: DaySheetCorrection,
  approvedBy: string,
  now?: string,
): DaySheetCorrection {
  if (correction.status !== "draft") {
    throw new Error(`Cannot approve correction from status '${correction.status}'.`)
  }
  const ts = now ?? new Date().toISOString()
  return { ...correction, status: "approved", approved_by: approvedBy, approved_at: ts, updated_at: ts }
}

// ---------------------------------------------------------------------------
// Apply correction — supersedes old publication, marks correction applied
// ---------------------------------------------------------------------------

export interface ApplyCorrectionResult {
  correction: DaySheetCorrection
  superseded_publication: DaySheetPublication
}

export function applyCorrection(
  correction: DaySheetCorrection,
  publication: DaySheetPublication,
  now?: string,
): ApplyCorrectionResult {
  if (correction.status !== "approved") {
    throw new Error(`Correction must be approved before applying (status: ${correction.status}).`)
  }
  if (correction.publication_id !== publication.id) {
    throw new Error(`Correction publication_id mismatch.`)
  }
  const ts = now ?? new Date().toISOString()

  const updatedCorrection: DaySheetCorrection = {
    ...correction,
    status: "superseded_publication",
    updated_at: ts,
  }

  const superseded = supersedePublication(publication, ts)

  return { correction: updatedCorrection, superseded_publication: superseded }
}

// ---------------------------------------------------------------------------
// Invalidate old acknowledgements for re-ack recipients
// ---------------------------------------------------------------------------

import type { DaySheetAcknowledgement } from "./day-sheet-publication"

export function invalidateAcknowledgements(
  acks: DaySheetAcknowledgement[],
  reackUserIds: string[],
  newPublicationId: string,
  newAckTokens: Map<string, string>,  // user_id → new token
  newDeadline?: string,
  now?: string,
): DaySheetAcknowledgement[] {
  const reackSet = new Set(reackUserIds)
  const ts = now ?? new Date().toISOString()
  void ts

  return acks.map((ack) => {
    if (!reackSet.has(ack.user_id)) return ack
    const newToken = newAckTokens.get(ack.user_id)
    if (!newToken) return ack
    return {
      ...ack,
      publication_id: newPublicationId,
      status: "pending",
      ack_token: newToken,
      ack_deadline: newDeadline ?? ack.ack_deadline,
      acknowledged_at: undefined,
      declined_at: undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// Correction summary
// ---------------------------------------------------------------------------

export interface CorrectionSummary {
  id: string
  severity: CorrectionSeverity
  status: CorrectionStatus
  changed_domains: CorrectedDomain[]
  requires_reack: boolean
  reack_count: number
  summary: string
}

export function summarizeCorrection(c: DaySheetCorrection): CorrectionSummary {
  return {
    id: c.id,
    severity: c.severity,
    status: c.status,
    changed_domains: c.changed_domains,
    requires_reack: c.requires_reack,
    reack_count: c.reack_required_user_ids.length,
    summary: c.summary,
  }
}
