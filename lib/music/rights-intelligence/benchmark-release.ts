export interface BenchmarkGateInput {
  consentPassed: boolean
  qualityPassed: boolean
  privacyPassed: boolean
  competitionPassed: boolean
  methodologyPassed: boolean
  sourceFresh: boolean
  containsRecommendation: boolean
}

export function canPublishBenchmark(input: BenchmarkGateInput): boolean {
  return input.consentPassed && input.qualityPassed && input.privacyPassed &&
    input.competitionPassed && input.methodologyPassed && input.sourceFresh &&
    !input.containsRecommendation
}
