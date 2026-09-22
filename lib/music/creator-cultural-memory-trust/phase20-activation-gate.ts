export interface ActivationEvidence {
  legalEntity: boolean
  charterEffective: boolean
  communityGovernance: boolean
  multipleCustodians: boolean
  independentImplementations: boolean
  restorePassed: boolean
  restrictionPropagationPassed: boolean
  providerReplacementPassed: boolean
  tourifyUnavailablePassed: boolean
  unresolvedCriticalBlockers: number
  expiresAt?: Date
  now?: Date
}

export function evaluatePhase20Activation(evidence: ActivationEvidence) {
  const blockers: string[] = []
  if (!evidence.legalEntity) blockers.push("legal_entity")
  if (!evidence.charterEffective) blockers.push("charter_effective")
  if (!evidence.communityGovernance) blockers.push("community_governance")
  if (!evidence.multipleCustodians) blockers.push("multiple_custodians")
  if (!evidence.independentImplementations) blockers.push("independent_implementations")
  if (!evidence.restorePassed) blockers.push("restore")
  if (!evidence.restrictionPropagationPassed) blockers.push("restriction_propagation")
  if (!evidence.providerReplacementPassed) blockers.push("provider_replacement")
  if (!evidence.tourifyUnavailablePassed) blockers.push("tourify_unavailable")
  if (evidence.unresolvedCriticalBlockers > 0) blockers.push("critical_blockers")
  if (!evidence.expiresAt) blockers.push("expires_at_missing")
  else if (evidence.now && evidence.expiresAt <= evidence.now) blockers.push("expires_at_stale")
  const allowed = blockers.length === 0
  return {
    allowed,
    reason: allowed ? "activation_ready" : "activation_denied",
    blockers,
    mode: allowed ? "limited_time_bound_pilot" : "disabled",
  }
}

/** Reference-compatible boolean helper — fails closed. */
export function canActivatePhase20(evidence: ActivationEvidence): boolean {
  return evaluatePhase20Activation(evidence).allowed
}
