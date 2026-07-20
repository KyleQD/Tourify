export interface UnderwritingFactor {
  key: string
  scoreBasisPoints: number
  weightBasisPoints: number
  confidenceBasisPoints: number
}

export interface UnderwritingScoreResult {
  weightedScoreBasisPoints: number
  confidenceBasisPoints: number
  trace: Array<{ key: string; weightedContribution: number }>
}

export function calculateUnderwritingScore(
  factors: UnderwritingFactor[],
): UnderwritingScoreResult {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weightBasisPoints, 0)
  if (totalWeight !== 10_000) throw new Error("weights_must_total_10000_basis_points")

  const trace = factors.map((factor) => ({
    key: factor.key,
    weightedContribution: Math.trunc(
      (factor.scoreBasisPoints * factor.weightBasisPoints) / 10_000,
    ),
  }))

  const weightedScoreBasisPoints = trace.reduce(
    (sum, item) => sum + item.weightedContribution,
    0,
  )
  const confidenceBasisPoints = Math.trunc(
    factors.reduce(
      (sum, factor) => sum + factor.confidenceBasisPoints * factor.weightBasisPoints,
      0,
    ) / 10_000,
  )

  return { weightedScoreBasisPoints, confidenceBasisPoints, trace }
}
