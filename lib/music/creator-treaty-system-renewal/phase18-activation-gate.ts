export interface Phase18ActivationInput {
  repeatedPhase17Cycles: number
  legalReviewApproved: boolean
  renewalAuthorityVerified: boolean
  archiveRestorePassed: boolean
  independentOperators: number
  tourifyUnavailablePassed: boolean
  unresolvedCriticalBlockers: number
  expiresAt?: Date
  now: Date
}

export function evaluatePhase18Activation(input: Phase18ActivationInput) {
  const blockers: string[] = []
  if (input.repeatedPhase17Cycles < 2) blockers.push("repeated_phase17_cycles")
  if (!input.legalReviewApproved) blockers.push("legal_review")
  if (!input.renewalAuthorityVerified) blockers.push("renewal_authority")
  if (!input.archiveRestorePassed) blockers.push("archive_restore")
  if (input.independentOperators < 2) blockers.push("independent_operators")
  if (!input.tourifyUnavailablePassed) blockers.push("tourify_unavailable")
  if (input.unresolvedCriticalBlockers > 0) blockers.push("critical_blockers")
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
