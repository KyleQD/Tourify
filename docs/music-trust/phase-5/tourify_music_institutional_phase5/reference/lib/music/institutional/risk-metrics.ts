export interface Exposure {
  key: string
  amountMinor: bigint
}

export interface ConcentrationResult {
  largestExposureBasisPoints: number
  topFiveBasisPoints: number
  exposureCount: number
}

export function calculateConcentration(exposures: Exposure[]): ConcentrationResult {
  const positive = exposures.filter((item) => item.amountMinor > 0n)
  const total = positive.reduce((sum, item) => sum + item.amountMinor, 0n)
  if (total === 0n) return { largestExposureBasisPoints: 0, topFiveBasisPoints: 0, exposureCount: 0 }

  const sorted = [...positive].sort((a, b) => (a.amountMinor > b.amountMinor ? -1 : 1))
  const toBps = (amount: bigint) => Number((amount * 10_000n) / total)
  return {
    largestExposureBasisPoints: toBps(sorted[0].amountMinor),
    topFiveBasisPoints: toBps(sorted.slice(0, 5).reduce((sum, item) => sum + item.amountMinor, 0n)),
    exposureCount: sorted.length,
  }
}
