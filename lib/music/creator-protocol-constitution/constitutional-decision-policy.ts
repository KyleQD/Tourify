export interface DecisionInput {
  eligibleVotes: number
  votesCast: number
  approvals: number
  rejections: number
  quorumPercent: number
  approvalPercent: number
  classVetoSatisfied: boolean
  conflictsReviewed: boolean
}

export function evaluateDecision(input: DecisionInput) {
  const participation = input.eligibleVotes === 0 ? 0 : input.votesCast / input.eligibleVotes
  const approval = input.votesCast === 0 ? 0 : input.approvals / input.votesCast
  const reasons: string[] = []
  if (participation < input.quorumPercent) reasons.push("QUORUM_NOT_MET")
  if (approval < input.approvalPercent) reasons.push("APPROVAL_THRESHOLD_NOT_MET")
  if (!input.classVetoSatisfied) reasons.push("REQUIRED_CLASS_APPROVAL_MISSING")
  if (!input.conflictsReviewed) reasons.push("CONFLICT_REVIEW_MISSING")
  return { allowed: reasons.length === 0, reasons, participation, approval }
}
