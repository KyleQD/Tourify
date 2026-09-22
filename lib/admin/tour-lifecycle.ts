/**
 * TOUR-101 — Canonical tour lifecycle state machine.
 *
 * Spec states (doc 02): draft → planning → ready → published → active →
 * completed → settled → archived | cancelled.
 *
 * Direct arbitrary status writes are prohibited; use transition commands.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { evaluateSeparationOfDuties } from "@/lib/admin/separation-of-duties"

export const TOUR_LIFECYCLE_STATES = [
  "draft",
  "planning",
  "ready",
  "published",
  "active",
  "completed",
  "settled",
  "cancelled",
  "archived",
] as const

export type TourLifecycleState = (typeof TOUR_LIFECYCLE_STATES)[number]

export const TOUR_TRANSITION_COMMANDS = [
  "start_planning",
  "mark_ready",
  "publish",
  "retract",
  "activate",
  "complete",
  "settle",
  "cancel",
  "archive",
  "restore",
] as const

export type TourTransitionCommand = (typeof TOUR_TRANSITION_COMMANDS)[number]

export type TourTransitionSideEffect =
  | "outbox.tour.lifecycle_changed"
  | "outbox.tour.published"
  | "outbox.tour.retracted"
  | "outbox.tour.cancelled"
  | "outbox.tour.archived"
  | "readiness.recompute"
  | "publication.snapshot"
  | "finance.closeout_gate"

export interface TourTransitionDefinition {
  command: TourTransitionCommand
  from: readonly TourLifecycleState[]
  to: TourLifecycleState
  capability: AdminCapability
  /** When true, caller must supply a non-empty reason. */
  requiresReason: boolean
  /** Named blockers that must be empty before the transition succeeds. */
  blockers: readonly string[]
  sideEffects: readonly TourTransitionSideEffect[]
  /** Human-readable invalid-transition error code. */
  invalidCode: string
}

export const TOUR_TRANSITIONS: readonly TourTransitionDefinition[] = [
  {
    command: "start_planning",
    from: ["draft"],
    to: "planning",
    capability: "tour.manage",
    requiresReason: false,
    blockers: [],
    sideEffects: ["outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_start_planning",
  },
  {
    command: "mark_ready",
    from: ["planning"],
    to: "ready",
    capability: "tour.manage",
    requiresReason: false,
    blockers: ["readiness.mandatory"],
    sideEffects: ["readiness.recompute", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_mark_ready",
  },
  {
    command: "publish",
    from: ["ready", "published"],
    to: "published",
    capability: "tour.publish",
    requiresReason: false,
    blockers: ["readiness.mandatory"],
    sideEffects: ["publication.snapshot", "outbox.tour.published", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_publish",
  },
  {
    command: "retract",
    from: ["published"],
    to: "ready",
    capability: "tour.publish",
    requiresReason: true,
    blockers: [],
    sideEffects: ["outbox.tour.retracted", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_retract",
  },
  {
    command: "activate",
    from: ["published", "ready"],
    to: "active",
    capability: "tour.manage",
    requiresReason: false,
    blockers: [],
    sideEffects: ["outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_activate",
  },
  {
    command: "complete",
    from: ["active"],
    to: "completed",
    capability: "tour.manage",
    requiresReason: false,
    blockers: ["stops.all_ended"],
    sideEffects: ["outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_complete",
  },
  {
    command: "settle",
    from: ["completed"],
    to: "settled",
    capability: "finance.approve",
    requiresReason: false,
    blockers: ["finance.settlements_approved"],
    sideEffects: ["finance.closeout_gate", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_settle",
  },
  {
    command: "cancel",
    from: ["draft", "planning", "ready", "published", "active"],
    to: "cancelled",
    capability: "tour.manage",
    requiresReason: true,
    blockers: [],
    sideEffects: ["outbox.tour.cancelled", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_cancel",
  },
  {
    command: "archive",
    from: ["completed", "settled", "cancelled"],
    to: "archived",
    capability: "tour.archive",
    requiresReason: false,
    blockers: [],
    sideEffects: ["outbox.tour.archived", "outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_archive",
  },
  {
    command: "restore",
    from: ["archived"],
    to: "completed",
    capability: "tour.archive",
    requiresReason: true,
    blockers: [],
    sideEffects: ["outbox.tour.lifecycle_changed"],
    invalidCode: "tour_transition_invalid_restore",
  },
] as const

/** Legacy tour.status values still present in DB → canonical lifecycle. */
export const LEGACY_TOUR_STATUS_MAP: Record<string, TourLifecycleState> = {
  draft: "draft",
  planning: "planning",
  on_hold: "planning",
  ready: "ready",
  published: "published",
  active: "active",
  completed: "completed",
  settled: "settled",
  cancelled: "cancelled",
  canceled: "cancelled",
  archived: "archived",
}

export function normalizeTourLifecycleState(
  value: string | null | undefined,
): TourLifecycleState | null {
  if (!value) return null
  const key = String(value).trim().toLowerCase()
  if ((TOUR_LIFECYCLE_STATES as readonly string[]).includes(key)) {
    return key as TourLifecycleState
  }
  return LEGACY_TOUR_STATUS_MAP[key] ?? null
}

export function getTourTransition(
  command: TourTransitionCommand,
): TourTransitionDefinition | undefined {
  return TOUR_TRANSITIONS.find((row) => row.command === command)
}

export interface TourTransitionEvaluation {
  ok: boolean
  definition?: TourTransitionDefinition
  nextState?: TourLifecycleState
  code?: string
  message?: string
  unmetBlockers?: string[]
}

export interface EvaluateTourTransitionInput {
  command: TourTransitionCommand
  currentState: string | null | undefined
  capabilities: readonly AdminCapability[]
  reason?: string | null
  /** Keys of currently unmet blockers (e.g. readiness.mandatory). */
  unmetBlockers?: readonly string[]
  /** SEC-202 — publisher/creator for settle separation-of-duties. */
  actorUserId?: string | null
  priorActorUserId?: string | null
  /** SEC-202 — legal hold blocks archive. */
  legallyRetained?: boolean
}

/**
 * Pure evaluation of a lifecycle transition (no I/O).
 * Callers enforce result + persist + emit side effects.
 */
export function evaluateTourTransition(
  input: EvaluateTourTransitionInput,
): TourTransitionEvaluation {
  const definition = getTourTransition(input.command)
  if (!definition) {
    return {
      ok: false,
      code: "tour_transition_unknown",
      message: "Unknown tour lifecycle command.",
    }
  }

  const current = normalizeTourLifecycleState(input.currentState)
  if (!current) {
    return {
      ok: false,
      definition,
      code: "tour_lifecycle_state_unknown",
      message: "Tour lifecycle state is missing or unrecognized.",
    }
  }

  if (!definition.from.includes(current)) {
    return {
      ok: false,
      definition,
      code: definition.invalidCode,
      message: `Cannot ${definition.command} a tour in state "${current}".`,
    }
  }

  if (!input.capabilities.includes(definition.capability)) {
    return {
      ok: false,
      definition,
      code: "capability_denied",
      message: `Missing capability ${definition.capability}.`,
    }
  }

  if (definition.requiresReason && !input.reason?.trim()) {
    return {
      ok: false,
      definition,
      code: "tour_transition_reason_required",
      message: `A reason is required for ${definition.command}.`,
    }
  }

  if (input.legallyRetained && definition.command === "archive") {
    return {
      ok: false,
      definition,
      code: "legally_retained",
      message: "Legally retained tours cannot be archived until retention is released.",
    }
  }

  // SEC-202 — settle requires separation from publisher/creator when known.
  if (definition.command === "settle" && input.actorUserId) {
    const sod = evaluateSeparationOfDuties({
      actorUserId: input.actorUserId,
      priorActorUserId: input.priorActorUserId,
      action: "settle",
    })
    if (!sod.ok) {
      return {
        ok: false,
        definition,
        code: sod.code,
        message: sod.message,
      }
    }
  }

  const unmet = (input.unmetBlockers || []).filter((b) =>
    definition.blockers.includes(b),
  )
  if (unmet.length > 0) {
    return {
      ok: false,
      definition,
      code: "tour_transition_blocked",
      message: "Transition blocked by unmet prerequisites.",
      unmetBlockers: unmet,
    }
  }

  return {
    ok: true,
    definition,
    nextState: definition.to,
  }
}

/** Hard delete is only eligible for unreferenced drafts (TOUR delete policy). */
export function isTourHardDeleteEligible(state: string | null | undefined): boolean {
  return normalizeTourLifecycleState(state) === "draft"
}

/** Archived / cancelled tours are read-only for metadata edits. */
export function isTourLifecycleReadOnly(state: string | null | undefined): boolean {
  const normalized = normalizeTourLifecycleState(state)
  return normalized === "archived" || normalized === "cancelled"
}
