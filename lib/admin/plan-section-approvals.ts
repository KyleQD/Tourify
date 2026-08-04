/**
 * PLAN-401 — Section ownership and change approvals for tour plan.
 *
 * Route and stop changes that affect owned sections can be gated behind an
 * approval workflow. Pending changes are visible but do NOT alter published
 * operations until approved.
 *
 * Design:
 *  - A `PlanSection` maps to a plan domain (stops, route, dates, party, etc.)
 *  - Each section can have an owner (user or department) and an approval policy.
 *  - A `PendingPlanChange` captures a proposed mutation; it is separate from
 *    the live plan record and does not alter published state until approved.
 *  - Approval gate: approved → merged into plan; rejected → archived with reason.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

export const PLAN_SECTIONS = [
  "stops",
  "route",
  "dates",
  "party",
  "travel",
  "lodging",
  "schedules",
  "advance",
  "budget",
] as const
export type PlanSection = (typeof PLAN_SECTIONS)[number]

export type ApprovalPolicy = "none" | "owner_only" | "any_approved_editor"

export interface PlanSectionOwnership {
  section: PlanSection
  owner_user_id: string | null
  owner_department: string | null
  approval_policy: ApprovalPolicy
  /** IDs of users who can approve changes (besides owner). */
  approver_ids: string[]
}

// ---------------------------------------------------------------------------
// Pending plan change
// ---------------------------------------------------------------------------

export type PendingChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"

export interface PendingPlanChange {
  change_id: string
  tour_id: string
  section: PlanSection
  proposed_by: string
  proposed_at: string
  status: PendingChangeStatus
  /** Human-readable summary of the proposed change. */
  summary: string
  /** Serialised diff/payload; opaque to this module. */
  payload: unknown
  reviewed_by: string | null
  reviewed_at: string | null
  review_reason: string | null
  /** Whether this change affects published operations (gating flag). */
  affects_published_operations: boolean
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPendingChange(params: {
  change_id: string
  tour_id: string
  section: PlanSection
  proposed_by: string
  proposed_at: string
  summary: string
  payload: unknown
  affects_published_operations?: boolean
}): PendingPlanChange {
  return {
    change_id: params.change_id,
    tour_id: params.tour_id,
    section: params.section,
    proposed_by: params.proposed_by,
    proposed_at: params.proposed_at,
    status: "pending",
    summary: params.summary,
    payload: params.payload,
    reviewed_by: null,
    reviewed_at: null,
    review_reason: null,
    affects_published_operations: params.affects_published_operations ?? false,
  }
}

// ---------------------------------------------------------------------------
// Authorization check
// ---------------------------------------------------------------------------

export interface ChangeApprovalCheck {
  authorized: boolean
  reason: string
}

/**
 * Determine whether `actorId` may approve/reject a pending change
 * given the section's ownership and policy.
 */
export function checkApprovalAuthorization(
  change: PendingPlanChange,
  ownership: PlanSectionOwnership,
  actorId: string,
): ChangeApprovalCheck {
  if (change.status !== "pending") {
    return { authorized: false, reason: `Change is already '${change.status}'. Only pending changes can be reviewed.` }
  }

  if (ownership.approval_policy === "none") {
    return { authorized: true, reason: "No approval gate; any actor may proceed." }
  }

  if (ownership.approval_policy === "owner_only") {
    if (ownership.owner_user_id && actorId === ownership.owner_user_id) {
      return { authorized: true, reason: "Actor is section owner." }
    }
    return { authorized: false, reason: "Only the section owner may approve this change." }
  }

  // any_approved_editor
  if (
    actorId === ownership.owner_user_id ||
    ownership.approver_ids.includes(actorId)
  ) {
    return { authorized: true, reason: "Actor is owner or approved editor." }
  }

  return { authorized: false, reason: "Actor is not an owner or approved editor for this section." }
}

// ---------------------------------------------------------------------------
// Approve / reject / withdraw
// ---------------------------------------------------------------------------

export interface ChangeReviewResult {
  ok: boolean
  change: PendingPlanChange | null
  error?: string
}

export function approveChange(
  change: PendingPlanChange,
  ownership: PlanSectionOwnership,
  actor: string,
  now: string,
): ChangeReviewResult {
  const auth = checkApprovalAuthorization(change, ownership, actor)
  if (!auth.authorized) {
    return { ok: false, change: null, error: auth.reason }
  }
  return {
    ok: true,
    change: { ...change, status: "approved", reviewed_by: actor, reviewed_at: now, review_reason: null },
  }
}

export function rejectChange(
  change: PendingPlanChange,
  ownership: PlanSectionOwnership,
  actor: string,
  now: string,
  reason: string,
): ChangeReviewResult {
  if (!reason.trim()) {
    return { ok: false, change: null, error: "Rejection reason is required." }
  }
  const auth = checkApprovalAuthorization(change, ownership, actor)
  if (!auth.authorized) {
    return { ok: false, change: null, error: auth.reason }
  }
  return {
    ok: true,
    change: { ...change, status: "rejected", reviewed_by: actor, reviewed_at: now, review_reason: reason },
  }
}

export function withdrawChange(
  change: PendingPlanChange,
  actor: string,
  now: string,
): ChangeReviewResult {
  if (change.status !== "pending") {
    return { ok: false, change: null, error: "Only pending changes can be withdrawn." }
  }
  if (change.proposed_by !== actor) {
    return { ok: false, change: null, error: "Only the proposer may withdraw a change." }
  }
  return {
    ok: true,
    change: { ...change, status: "withdrawn", reviewed_by: actor, reviewed_at: now, review_reason: null },
  }
}

// ---------------------------------------------------------------------------
// Pending change board view
// ---------------------------------------------------------------------------

export interface PendingChangeSummary {
  total_pending: number
  pending_affecting_published: number
  by_section: Partial<Record<PlanSection, number>>
}

export function summarizePendingChanges(
  changes: readonly PendingPlanChange[],
): PendingChangeSummary {
  const pending = changes.filter((c) => c.status === "pending")
  const by_section: Partial<Record<PlanSection, number>> = {}

  for (const c of pending) {
    by_section[c.section] = (by_section[c.section] ?? 0) + 1
  }

  return {
    total_pending: pending.length,
    pending_affecting_published: pending.filter((c) => c.affects_published_operations).length,
    by_section,
  }
}
