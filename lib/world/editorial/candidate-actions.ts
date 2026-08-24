/**
 * P14-T02 — candidate actions as a pure, fail-closed state machine.
 *
 * Every action validates the current row state against the frozen P2
 * lifecycle vocabulary before producing a patch + audit plan. Nothing here
 * touches the database — `applyCandidateActions` (server-actions.ts) is the
 * only writer. Unknown states/actions fail closed.
 */
import type { WorldAuditAction } from "./audit-events"
import { nextVersion } from "./concurrency"

export const CANDIDATE_ACTIONS = [
  "approve",
  "reject",
  "request_evidence",
  "match_existing",
  "create_draft",
  "merge_duplicate",
  "assign_reviewer",
] as const
export type CandidateAction = (typeof CANDIDATE_ACTIONS)[number]

export type ReviewStatus = "candidate" | "needs_review" | "approved" | "rejected"
export type MatchStatus = "unmatched" | "matched" | "ambiguous" | "new_candidate" | "rejected"

/** Platform permission required per action (World RBAC, never org roles). */
export const REQUIRED_PERMISSION: Readonly<Record<CandidateAction, string>> = Object.freeze({
  approve: "world.knowledge.review",
  reject: "world.knowledge.review",
  request_evidence: "world.knowledge.review",
  match_existing: "world.knowledge.review",
  create_draft: "world.knowledge.review",
  merge_duplicate: "world.knowledge.review",
  assign_reviewer: "world.knowledge.review",
})

export interface CandidateSnapshot {
  id: string
  review_status: ReviewStatus
  match_status: MatchStatus
  version?: number | null
  matched_id?: string | null
}

export interface CandidateActionInput {
  action: CandidateAction
  reason: string
  /** Target for match_existing / merge_duplicate. */
  targetMatchId?: string | null
  /** Reviewer id for assign_reviewer. */
  assigneeId?: string | null
}

export interface CandidatePatch {
  review_status?: ReviewStatus
  match_status?: MatchStatus
  reviewer_notes?: string | null
  matched_id?: string | null
  assigned_reviewer?: string | null
  evidence_requested_at?: string | null
  merged_into_id?: string | null
  draft_created?: boolean
  version: number
}

export type CandidatePlan =
  | {
      ok: true
      patch: CandidatePatch
      auditAction: WorldAuditAction
      /** Composite transitions record each legal step separately. */
      auditSteps: number
    }
  | { ok: false; error: string }

function fail(error: string): CandidatePlan {
  return { ok: false, error }
}

/**
 * Plan one candidate action. Deterministic; throws nothing (invalid input is
 * a plan rejection, not an exception) so callers can surface field errors.
 */
export function planCandidateAction(
  snapshot: CandidateSnapshot,
  input: CandidateActionInput,
): CandidatePlan {
  if (!(CANDIDATE_ACTIONS as readonly string[]).includes(input.action)) return fail("unknown_action")
  if (!input.reason?.trim()) return fail("reason_required")

  // Note: the authoritative version CAS runs in the server orchestrator
  // against the stored row (P14-T09). Planning is pure and conflict-free.

  const current = snapshot.review_status
  const patchBase = { version: nextVersion(snapshot.version) }

  switch (input.action) {
    case "approve": {
      // Frozen machine: candidate→needs_review→approved (composite of two
      // legal steps; recorded as two audit entries).
      if (current === "needs_review") {
        return { ok: true, patch: { ...patchBase, review_status: "approved" }, auditAction: "candidate.approve", auditSteps: 1 }
      }
      if (current === "candidate") {
        return { ok: true, patch: { ...patchBase, review_status: "approved" }, auditAction: "candidate.approve", auditSteps: 2 }
      }
      return fail(`approve_requires_candidate_or_needs_review_got_${current}`)
    }
    case "reject": {
      if (current !== "candidate" && current !== "needs_review") {
        return fail(`reject_requires_candidate_or_needs_review_got_${current}`)
      }
      return { ok: true, patch: { ...patchBase, review_status: "rejected", reviewer_notes: input.reason }, auditAction: "candidate.reject", auditSteps: 1 }
    }
    case "request_evidence": {
      if (current === "approved" || current === "rejected") {
        return fail(`request_evidence_requires_open_state_got_${current}`)
      }
      return {
        ok: true,
        patch: { ...patchBase, review_status: "needs_review", evidence_requested_at: new Date().toISOString(), reviewer_notes: input.reason },
        auditAction: "candidate.request_evidence",
        auditSteps: 1,
      }
    }
    case "match_existing": {
      if (!input.targetMatchId?.trim()) return fail("target_match_id_required")
      return {
        ok: true,
        patch: { ...patchBase, match_status: "matched", matched_id: input.targetMatchId.trim() },
        auditAction: "candidate.match_existing",
        auditSteps: 1,
      }
    }
    case "create_draft": {
      // Drafts may only be created from reviewed-and-approved candidates.
      if (current !== "approved") return fail(`create_draft_requires_approved_got_${current}`)
      return { ok: true, patch: { ...patchBase, draft_created: true }, auditAction: "candidate.create_draft", auditSteps: 1 }
    }
    case "merge_duplicate": {
      if (!input.targetMatchId?.trim()) return fail("target_match_id_required")
      if (snapshot.match_status === "new_candidate") return fail("cannot_merge_new_candidate")
      return {
        ok: true,
        patch: { ...patchBase, merged_into_id: input.targetMatchId.trim(), match_status: "matched" },
        auditAction: "candidate.merge_duplicate",
        auditSteps: 1,
      }
    }
    case "assign_reviewer": {
      if (!input.assigneeId?.trim()) return fail("assignee_required")
      return {
        ok: true,
        patch: { ...patchBase, assigned_reviewer: input.assigneeId.trim(), review_status: current === "candidate" ? "needs_review" : current },
        auditAction: "candidate.assign_reviewer",
        auditSteps: 1,
      }
    }
  }
}

