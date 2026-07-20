export interface FundingSource { id: string; amountMinor: bigint; relatedParty: boolean }

export interface FundingConcentrationResult {
  totalMinor: bigint
  largestShareBps: number
  relatedPartyShareBps: number
  reviewRequired: boolean
}

function bps(part: bigint, total: bigint): number {
  if (total === 0n) return 0
  return Number((part * 10_000n) / total)
}

export function evaluateFundingConcentration(sources: FundingSource[], reviewThresholdBps = 3500): FundingConcentrationResult {
  const total = sources.reduce((sum, source) => sum + source.amountMinor, 0n)
  const largest = sources.reduce((max, source) => source.amountMinor > max ? source.amountMinor : max, 0n)
  const related = sources.filter((source) => source.relatedParty).reduce((sum, source) => sum + source.amountMinor, 0n)
  const largestShareBps = bps(largest, total)
  const relatedPartyShareBps = bps(related, total)
  return { totalMinor: total, largestShareBps, relatedPartyShareBps, reviewRequired: largestShareBps >= reviewThresholdBps || relatedPartyShareBps >= reviewThresholdBps }
}
