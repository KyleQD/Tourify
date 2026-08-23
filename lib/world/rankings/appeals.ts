/**
 * P17-T10 — geographic classification appeals.
 *
 * Artists/subjects can dispute a materially incorrect placement (wrong
 * city/scope). Appeals are pure review candidates: they never mutate a
 * published snapshot, and they carry the snapshot identity they contest.
 */

export type AppealStatus = "submitted" | "under_review" | "accepted" | "rejected"

export interface RankingAppealDraft {
  subjectId: string
  subjectKind: "artist" | "track" | "genre" | "scene" | "event" | "venue"
  scope: string
  scopeKey: string
  window: string
  claimedScopeKey: string
  reason: string
  submittedBy: string
}

export type AppealValidation =
  | { ok: true; draft: RankingAppealDraft & { status: AppealStatus } }
  | { ok: false; error: string }

/** Validate one appeal. Fail-closed; identical inputs give identical drafts. */
export function validateAppeal(
  input: RankingAppealDraft,
  nowIso: string = new Date().toISOString(),
): AppealValidation {
  if (!input.subjectId?.trim()) return { ok: false, error: "subject_required" }
  if (!input.scopeKey?.trim() || !input.claimedScopeKey?.trim()) return { ok: false, error: "scope_keys_required" }
  if (input.scopeKey === input.claimedScopeKey) {
    return { ok: false, error: "appeal_requires_a_material_correction" }
  }
  if (!input.reason?.trim() || input.reason.trim().length < 20 || input.reason.length > 2000) {
    return { ok: false, error: "reason_required_20_to_2000" }
  }
  if (!input.submittedBy?.trim()) return { ok: false, error: "submitter_required" }

  return {
    ok: true,
    draft: {
      ...input,
      subjectId: input.subjectId.trim(),
      claimedScopeKey: input.claimedScopeKey.trim(),
      reason: input.reason.trim(),
      submittedBy: input.submittedBy.trim(),
      status: "submitted",
    },
  }
}

/**
 * Public-facing appeal state explanation. Review internals (reviewer ids,
 * fraud signals) are never exposed — only the stage the appeal reached.
 */
export function publicAppealStatus(status: AppealStatus): string {
  switch (status) {
    case "submitted":
      return "Received — an editor will review your geographic correction request."
    case "under_review":
      return "Under review."
    case "accepted":
      return "Accepted — future snapshots will use the corrected geography."
    case "rejected":
      return "Not accepted. You can resubmit with additional evidence."
  }
}
