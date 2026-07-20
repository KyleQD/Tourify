export interface InstitutionActivationInput {
  legalBasisEffective: boolean
  participantAuthorityVerified: boolean
  organsOperational: boolean
  hostReady: boolean
  fundingApproved: boolean
  oversightOperational: boolean
  staffRemedyAvailable: boolean
  privacyApproved: boolean
  securityApproved: boolean
  accessibilityApproved: boolean
  competitionApproved: boolean
  independentImplementations: number
  independentOperators: number
  tourifyUnavailableTestPassed: boolean
  unresolvedCriticalBlockers: number
}

export function evaluateInstitutionActivation(input: InstitutionActivationInput) {
  const reasons: string[] = []
  if (!input.legalBasisEffective) reasons.push("legalBasisEffective")
  if (!input.participantAuthorityVerified) reasons.push("participantAuthorityVerified")
  if (!input.organsOperational) reasons.push("organsOperational")
  if (!input.hostReady) reasons.push("hostReady")
  if (!input.fundingApproved) reasons.push("fundingApproved")
  if (!input.oversightOperational) reasons.push("oversightOperational")
  if (!input.staffRemedyAvailable) reasons.push("staffRemedyAvailable")
  if (!input.privacyApproved) reasons.push("privacyApproved")
  if (!input.securityApproved) reasons.push("securityApproved")
  if (!input.accessibilityApproved) reasons.push("accessibilityApproved")
  if (!input.competitionApproved) reasons.push("competitionApproved")
  if (input.independentImplementations < 2) reasons.push("independentImplementations")
  if (input.independentOperators < 2) reasons.push("independentOperators")
  if (!input.tourifyUnavailableTestPassed) reasons.push("tourifyUnavailableTestPassed")
  if (input.unresolvedCriticalBlockers > 0) reasons.push("unresolvedCriticalBlockers")
  return {
    allowed: reasons.length === 0,
    mode: reasons.length === 0 ? "limited_time_bound_pilot" : "disabled",
    reasons,
  }
}
