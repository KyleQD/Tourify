/**
 * SEC-202 — State-aware authorization.
 *
 * Completes the platform authorization formula:
 * authenticated actor + acting organization + required capability +
 * target belongs to organization + record state permits action.
 *
 * Published / active / settled / archived / legally retained records
 * require stronger mutations and separation-of-duties where configured.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import {
  isTourHardDeleteEligible,
  isTourLifecycleReadOnly,
  normalizeTourLifecycleState,
  type TourLifecycleState,
} from "@/lib/admin/tour-lifecycle"
import {
  canMutateFinanceTransaction,
  isPostedPaymentStatus,
  isSettledSettlementStatus,
} from "@/lib/admin/finance-reversal-rules"
import { evaluateSeparationOfDuties } from "@/lib/admin/separation-of-duties"

export { evaluateSeparationOfDuties } from "@/lib/admin/separation-of-duties"

export type StateAwareDomain =
  | "tour"
  | "event"
  | "finance_transaction"
  | "finance_settlement"

export type StateAwareAction =
  | "read"
  | "update_metadata"
  | "update_plan"
  | "update_status_direct"
  | "delete"
  | "approve"
  | "pay"
  | "settle"
  | "reverse"
  | "archive"
  | "restore"

export interface StateAwareAuthInput {
  domain: StateAwareDomain
  state: string | null | undefined
  action: StateAwareAction
  capabilities: readonly AdminCapability[]
  actorUserId: string
  /** Creator, publisher, or submitter used for separation-of-duties. */
  priorActorUserId?: string | null
  /** Legal hold / retention lock (settings.legal_retention | legal_hold). */
  legallyRetained?: boolean
}

export interface StateAwareAuthResult {
  ok: boolean
  code?: string
  message?: string
  requiredCapability?: AdminCapability
  requiresSeparationOfDuties?: boolean
}

export class StateAwareAuthDeniedError extends Error {
  readonly status: number
  readonly code: string

  constructor(result: StateAwareAuthResult, status = 409) {
    super(result.message || "Record state does not permit this action.")
    this.name = "StateAwareAuthDeniedError"
    this.status = status
    this.code = result.code || "state_forbidden"
  }
}

/** Tour settings keys that mark a record as legally retained. */
export function isLegallyRetainedFromSettings(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false
  const row = settings as Record<string, unknown>
  if (row.legal_retention === true || row.legally_retained === true) return true
  if (row.legal_hold === true) return true
  if (typeof row.legal_retention === "string" && row.legal_retention.trim()) return true
  if (typeof row.retention_until === "string" && row.retention_until.trim()) {
    const until = Date.parse(row.retention_until)
    if (Number.isFinite(until) && until > Date.now()) return true
  }
  const nested = row.compliance
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const compliance = nested as Record<string, unknown>
    if (compliance.legal_hold === true || compliance.legal_retention === true) return true
  }
  return false
}

/** Publisher / lifecycle actor stamped into tour.settings.lifecycle. */
export function readTourPriorLifecycleActor(settings: unknown): string | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null
  const lifecycle = (settings as Record<string, unknown>).lifecycle
  if (!lifecycle || typeof lifecycle !== "object" || Array.isArray(lifecycle)) return null
  const row = lifecycle as Record<string, unknown>
  for (const key of ["published_by", "activated_by", "completed_by", "last_actor_id"] as const) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function deny(
  code: string,
  message: string,
  requiredCapability?: AdminCapability,
): StateAwareAuthResult {
  return { ok: false, code, message, requiredCapability }
}

function requireCap(
  capabilities: readonly AdminCapability[],
  capability: AdminCapability,
  message: string,
): StateAwareAuthResult {
  if (!hasAdminCapability(capabilities, capability))
    return deny("capability_denied", message, capability)
  return { ok: true }
}

function evaluateTourAuth(input: StateAwareAuthInput): StateAwareAuthResult {
  const state = normalizeTourLifecycleState(input.state)
  const retained = Boolean(input.legallyRetained)

  if (input.action === "read") return { ok: true }

  if (retained && (input.action === "delete" || input.action === "archive")) {
    return deny(
      "legally_retained",
      "Legally retained tours cannot be deleted or archived until retention is released.",
    )
  }

  if (input.action === "delete") {
    if (!isTourHardDeleteEligible(input.state)) {
      return deny(
        "state_forbidden",
        "Only unreferenced draft tours may be hard-deleted. Archive or cancel instead.",
      )
    }
    return requireCap(input.capabilities, "tour.delete", "Missing capability tour.delete.")
  }

  if (input.action === "update_status_direct") {
    // TOUR-202 — status changes only via transition commands (any lifecycle state).
    return deny(
      "use_lifecycle_transition",
      `Direct status writes are not allowed${state ? ` for tours in state "${state}"` : ""}. Use POST /api/admin/tours/:id/transitions/:command.`,
    )
  }

  if (input.action === "restore") {
    if (state !== "archived")
      return deny("state_forbidden", "Only archived tours can be restored.")
    return requireCap(input.capabilities, "tour.archive", "Missing capability tour.archive.")
  }

  if (input.action === "archive") {
    if (retained)
      return deny("legally_retained", "Legally retained tours cannot be archived.")
    return requireCap(input.capabilities, "tour.archive", "Missing capability tour.archive.")
  }

  if (input.action === "settle") {
    const cap = requireCap(
      input.capabilities,
      "finance.approve",
      "Settling a tour requires finance.approve.",
    )
    if (!cap.ok) return cap
    return evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "settle",
    })
  }

  if (input.action === "approve" || input.action === "pay" || input.action === "reverse") {
    return deny("domain_mismatch", "Finance actions must use the finance domain.")
  }

  // Metadata / plan mutations
  if (isTourLifecycleReadOnly(input.state)) {
    return deny(
      "state_readonly",
      `Tours in state "${state}" are read-only for metadata and plan edits. Use restore or a lifecycle command.`,
    )
  }

  if (state === "settled") {
    if (input.action === "update_plan") {
      return deny(
        "state_forbidden",
        "Settled tours cannot change plan data. Create a correction workflow or restore from archive policy.",
      )
    }
    // Metadata on settled tours requires finance/archive authority (stronger than tour.manage).
    if (
      hasAdminCapability(input.capabilities, "finance.approve")
      || hasAdminCapability(input.capabilities, "tour.archive")
    ) {
      return { ok: true }
    }
    return deny(
      "state_forbidden",
      "Settled tour metadata requires finance.approve or tour.archive.",
      "finance.approve",
    )
  }

  if (state === "published" || state === "active" || state === "completed") {
    // Stronger surface: manage is required; plan edits still allowed for ops.
    return requireCap(input.capabilities, "tour.manage", "Missing capability tour.manage.")
  }

  return requireCap(input.capabilities, "tour.manage", "Missing capability tour.manage.")
}

const EVENT_READONLY = new Set(["cancelled", "canceled", "archived"])
const EVENT_SETTLED = new Set(["settled"])
const EVENT_STRONG = new Set(["published", "active", "live", "confirmed"])

function normalizeLooseState(state: string | null | undefined): string | null {
  if (!state) return null
  return String(state).trim().toLowerCase() || null
}

function evaluateEventAuth(input: StateAwareAuthInput): StateAwareAuthResult {
  const state = normalizeLooseState(input.state)
  const retained = Boolean(input.legallyRetained)

  if (input.action === "read") return { ok: true }

  if (retained && (input.action === "delete" || input.action === "archive")) {
    return deny(
      "legally_retained",
      "Legally retained events cannot be deleted or archived until retention is released.",
    )
  }

  if (input.action === "delete") {
    if (state && (EVENT_READONLY.has(state) || EVENT_SETTLED.has(state) || EVENT_STRONG.has(state))) {
      return deny(
        "state_forbidden",
        `Events in state "${state}" cannot be hard-deleted.`,
      )
    }
    return requireCap(input.capabilities, "event.manage", "Missing capability event.manage.")
  }

  if (EVENT_READONLY.has(state || "")) {
    if (input.action === "update_metadata" || input.action === "update_plan" || input.action === "update_status_direct") {
      return deny("state_readonly", `Events in state "${state}" are read-only.`)
    }
  }

  if (EVENT_SETTLED.has(state || "")) {
    // @ts-expect-error — "delete" was already handled above; this guard is defensive for future actions
    if (input.action === "update_plan" || input.action === "delete") {
      return deny("state_forbidden", "Settled events cannot change plan data or be deleted.")
    }
    if (input.action === "update_metadata" || input.action === "update_status_direct") {
      if (hasAdminCapability(input.capabilities, "finance.approve")) return { ok: true }
      return deny(
        "state_forbidden",
        "Settled event mutations require finance.approve.",
        "finance.approve",
      )
    }
  }

  if (EVENT_STRONG.has(state || "") && input.action === "update_status_direct") {
    // Published/active status changes still go through event.manage but are allowed
    // (events lack a full tour-style lifecycle command surface today).
    return requireCap(input.capabilities, "event.manage", "Missing capability event.manage.")
  }

  if (
    input.action === "update_metadata"
    || input.action === "update_plan"
    || input.action === "update_status_direct"
  ) {
    return requireCap(input.capabilities, "event.manage", "Missing capability event.manage.")
  }

  return { ok: true }
}

function evaluateFinanceTransactionAuth(input: StateAwareAuthInput): StateAwareAuthResult {
  if (input.action === "read") return { ok: true }

  if (input.legallyRetained && (input.action === "delete" || input.action === "reverse")) {
    return deny(
      "legally_retained",
      "Legally retained transactions cannot be deleted or reversed until retention is released.",
    )
  }

  if (input.action === "update_metadata" || input.action === "delete") {
    const guard = canMutateFinanceTransaction({
      paymentStatus: String(input.state || "pending"),
      action: input.action === "delete" ? "delete" : "update",
    })
    if (!guard.ok) return deny(guard.code, guard.message)
    return requireCap(input.capabilities, "finance.manage", "Missing capability finance.manage.")
  }

  if (input.action === "pay") {
    if (isPostedPaymentStatus(input.state)) {
      return deny("immutable_record", "Posted transactions cannot be paid again.")
    }
    const cap = requireCap(input.capabilities, "finance.pay", "Missing capability finance.pay.")
    if (!cap.ok) return cap
    return evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "pay",
    })
  }

  if (input.action === "approve") {
    const cap = requireCap(
      input.capabilities,
      "finance.approve",
      "Missing capability finance.approve.",
    )
    if (!cap.ok) return cap
    return evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "approve",
    })
  }

  if (input.action === "reverse") {
    if (!isPostedPaymentStatus(input.state)) {
      return deny("not_posted", "Only posted (paid/refunded) transactions can be reversed.")
    }
    return requireCap(input.capabilities, "finance.pay", "Missing capability finance.pay.")
  }

  return deny("unsupported_action", `Unsupported finance transaction action: ${input.action}`)
}

function evaluateFinanceSettlementAuth(input: StateAwareAuthInput): StateAwareAuthResult {
  if (input.action === "read") return { ok: true }

  if (input.legallyRetained && input.action === "delete") {
    return deny("legally_retained", "Legally retained settlements cannot be deleted.")
  }

  if (input.action === "update_metadata" || input.action === "delete") {
    if (isSettledSettlementStatus(input.state)) {
      return deny(
        "immutable_record",
        "Finalized/paid settlements are immutable — create a settlement adjustment.",
      )
    }
    return requireCap(input.capabilities, "finance.manage", "Missing capability finance.manage.")
  }

  if (input.action === "approve") {
    if (isSettledSettlementStatus(input.state) && input.state === "paid") {
      return deny("immutable_record", "Paid settlements cannot be re-approved.")
    }
    const cap = requireCap(
      input.capabilities,
      "finance.approve",
      "Missing capability finance.approve.",
    )
    if (!cap.ok) return cap
    return evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "approve",
    })
  }

  if (input.action === "pay") {
    const cap = requireCap(input.capabilities, "finance.pay", "Missing capability finance.pay.")
    if (!cap.ok) return cap
    return evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "pay",
    })
  }

  return deny("unsupported_action", `Unsupported finance settlement action: ${input.action}`)
}

export function evaluateStateAwareAuth(input: StateAwareAuthInput): StateAwareAuthResult {
  switch (input.domain) {
    case "tour":
      return evaluateTourAuth(input)
    case "event":
      return evaluateEventAuth(input)
    case "finance_transaction":
      return evaluateFinanceTransactionAuth(input)
    case "finance_settlement":
      return evaluateFinanceSettlementAuth(input)
    default:
      return deny("unknown_domain", "Unknown authorization domain.")
  }
}

export function assertStateAllowsAction(input: StateAwareAuthInput): void {
  const result = evaluateStateAwareAuth(input)
  if (!result.ok) {
    const status = result.code === "capability_denied" || result.code === "separation_of_duties"
      ? 403
      : 409
    throw new StateAwareAuthDeniedError(result, status)
  }
}

/** Convenience for tour mutation entry points. */
export function assertTourMutationAllowed(args: {
  status: string | null | undefined
  action: Extract<
    StateAwareAction,
    "update_metadata" | "update_plan" | "update_status_direct" | "delete"
  >
  capabilities: readonly AdminCapability[]
  actorUserId: string
  settings?: unknown
  createdBy?: string | null
}): void {
  assertStateAllowsAction({
    domain: "tour",
    state: args.status,
    action: args.action,
    capabilities: args.capabilities,
    actorUserId: args.actorUserId,
    priorActorUserId: readTourPriorLifecycleActor(args.settings) || args.createdBy || null,
    legallyRetained: isLegallyRetainedFromSettings(args.settings),
  })
}

export function tourStateStrength(state: string | null | undefined):
  | "open"
  | "strong"
  | "settled"
  | "readonly"
  | "unknown" {
  const normalized = normalizeTourLifecycleState(state)
  if (!normalized) return "unknown"
  if (normalized === "archived" || normalized === "cancelled") return "readonly"
  if (normalized === "settled") return "settled"
  if (
    normalized === "published"
    || normalized === "active"
    || normalized === "completed"
  ) {
    return "strong"
  }
  return "open"
}

export type { TourLifecycleState }
