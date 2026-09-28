export interface Phase19ActivationInput {
  phase18ProofsComplete: boolean
  centuryScaleStrategyApproved: boolean
  successorCustodyVerified: boolean
  culturalGovernanceApproved: boolean
  privacyArchivalAnalysisComplete: boolean
  openSpecsPublished: boolean
  independentArchivesCount: number
  sustainableFundingVerified: boolean
  disasterRecoveryPassed: boolean
  providerIndependenceVerified: boolean
  publicLegitimacyApproved: boolean
  independentOperators: number
  tourifyUnavailablePassed: boolean
  unresolvedCriticalBlockers: number
  claimsPerpetuity: boolean
  blocksLocalExit: boolean
  expiresAt?: Date
  now: Date
}

export function evaluatePhase19Activation(input: Phase19ActivationInput) {
  const blockers: string[] = []
  if (!input.phase18ProofsComplete) blockers.push("phase18_proofs")
  if (!input.centuryScaleStrategyApproved) blockers.push("century_scale_strategy")
  if (!input.successorCustodyVerified) blockers.push("successor_custody")
  if (!input.culturalGovernanceApproved) blockers.push("cultural_governance")
  if (!input.privacyArchivalAnalysisComplete) blockers.push("privacy_archival_analysis")
  if (!input.openSpecsPublished) blockers.push("open_specs")
  if (input.independentArchivesCount < 2) blockers.push("independent_archives")
  if (!input.sustainableFundingVerified) blockers.push("sustainable_funding")
  if (!input.disasterRecoveryPassed) blockers.push("disaster_recovery")
  if (!input.providerIndependenceVerified) blockers.push("provider_independence")
  if (!input.publicLegitimacyApproved) blockers.push("public_legitimacy")
  if (input.independentOperators < 2) blockers.push("independent_operators")
  if (!input.tourifyUnavailablePassed) blockers.push("tourify_unavailable")
  if (input.unresolvedCriticalBlockers > 0) blockers.push("critical_blockers")
  if (input.claimsPerpetuity) blockers.push("claims_perpetuity")
  if (input.blocksLocalExit) blockers.push("blocks_local_exit")
  if (!input.expiresAt) blockers.push("expires_at_missing")
  else if (input.expiresAt <= input.now) blockers.push("expires_at_stale")
  const allowed = blockers.length === 0
  return {
    allowed,
    reason: allowed ? "activation_ready" : "activation_denied",
    blockers,
    mode: allowed ? "limited_time_bound_pilot" : "disabled",
  }
}
