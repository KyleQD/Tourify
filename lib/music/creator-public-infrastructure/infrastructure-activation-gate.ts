export interface InfrastructureActivationInput {
  separateEntityApproved: boolean
  governanceApproved: boolean
  fundingApproved: boolean
  standardsProfilesApproved: boolean
  twoIndependentImplementationsPassed: boolean
  securityApproved: boolean
  privacyApproved: boolean
  accessibilityApproved: boolean
  jurisdictionApproved: boolean
  rollbackProven: boolean
}

export function evaluateInfrastructureActivation(input: InfrastructureActivationInput) {
  const failed = Object.entries(input).filter(([, value]) => !value).map(([key]) => key)
  return { allowed: failed.length === 0, failedRequirements: failed }
}
