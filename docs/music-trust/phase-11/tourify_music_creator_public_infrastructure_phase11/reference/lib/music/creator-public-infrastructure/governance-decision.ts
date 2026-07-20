export interface GovernanceDecisionInput {
  quorumMet: boolean
  conflictsCleared: boolean
  publicCommentComplete: boolean
  requiredIndependentApproval: boolean
  independentApprovalRecorded: boolean
  overridesLocalDecision: boolean
}

export function evaluateGovernanceDecision(input: GovernanceDecisionInput) {
  if (input.overridesLocalDecision) return { allowed: false, reason: "local_sovereignty_violation" }
  if (!input.quorumMet) return { allowed: false, reason: "quorum_not_met" }
  if (!input.conflictsCleared) return { allowed: false, reason: "conflict_unresolved" }
  if (!input.publicCommentComplete) return { allowed: false, reason: "consultation_incomplete" }
  if (input.requiredIndependentApproval && !input.independentApprovalRecorded) return { allowed: false, reason: "independent_approval_missing" }
  return { allowed: true, reason: "approved" }
}
