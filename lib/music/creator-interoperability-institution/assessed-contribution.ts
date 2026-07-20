interface AssessmentInput { approvedBudgetMinor:number; participantShareBps:number; scaleEffective:boolean; membershipEffective:boolean; }
export function calculateAssessedContribution(input: AssessmentInput) {
  if (!input.scaleEffective || !input.membershipEffective) return { allowed:false, amountMinor:0, reason:'legal_basis_missing' } as const
  if (!Number.isInteger(input.approvedBudgetMinor) || input.approvedBudgetMinor < 0) throw new Error('invalid budget')
  if (!Number.isInteger(input.participantShareBps) || input.participantShareBps < 0 || input.participantShareBps > 10000) throw new Error('invalid share')
  return { allowed:true, amountMinor:Math.floor(input.approvedBudgetMinor * input.participantShareBps / 10000), reason:'calculated' } as const
}
