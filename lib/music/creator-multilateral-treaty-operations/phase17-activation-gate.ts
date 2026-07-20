export interface Phase17ActivationInput {
  multiYearEvidence: boolean
  effectiveAuthority: boolean
  reviewMandate: boolean
  independentOperators: number
  tourifyUnavailablePassed: boolean
  remediesReady: boolean
  publicApproval: boolean
  criticalBlockers: number
  scope: string[]
  jurisdiction: string[]
  expiresAt: string
  rollbackReady: boolean
}

export function evaluatePhase17Activation(i: Phase17ActivationInput) {
  const blockers: string[] = []
  if (!i.multiYearEvidence) blockers.push("multi_year_evidence")
  if (!i.effectiveAuthority) blockers.push("authority")
  if (!i.reviewMandate) blockers.push("review_mandate")
  if (i.independentOperators < 2) blockers.push("independent_operators")
  if (!i.tourifyUnavailablePassed) blockers.push("tourify_unavailable")
  if (!i.remediesReady) blockers.push("remedies")
  if (!i.publicApproval) blockers.push("public_approval")
  if (i.criticalBlockers > 0) blockers.push("critical_blockers")
  if (!i.scope.length || !i.jurisdiction.length) blockers.push("scope")
  if (!i.expiresAt) blockers.push("expiry")
  if (!i.rollbackReady) blockers.push("rollback")
  return {
    allowed: blockers.length === 0,
    mode: blockers.length === 0 ? "limited_time_bound_pilot" : "disabled",
    blockers,
  }
}
