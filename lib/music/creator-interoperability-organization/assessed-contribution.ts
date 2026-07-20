export interface AssessmentInput {
  approvedBudgetMinor: bigint
  approvedSharePpm: number
  arrearsMinor: bigint
  creditMinor: bigint
}
export function calculateAssessment(i: AssessmentInput): bigint {
  if (i.approvedSharePpm < 0 || i.approvedSharePpm > 1_000_000) throw new Error("INVALID_SHARE")
  return (i.approvedBudgetMinor * BigInt(i.approvedSharePpm)) / 1_000_000n + i.arrearsMinor - i.creditMinor
}
