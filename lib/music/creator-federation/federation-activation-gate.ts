export interface FederationActivationGateInput {
  entityApproved: boolean
  governingDocumentsApproved: boolean
  memberOrganizationsApproved: number
  trustFrameworkApproved: boolean
  securityReviewApproved: boolean
  privacyReviewApproved: boolean
  competitionReviewApproved: boolean
  jurisdictionApproved: boolean
  operationalOwnersAssigned: boolean
  rollbackTested: boolean
}

export function evaluateFederationActivation(input: FederationActivationGateInput): { ready: boolean; blockers: string[] } {
  const blockers = Object.entries(input).filter(([key, value]) => key === "memberOrganizationsApproved" ? Number(value) < 2 : value !== true).map(([key]) => key)
  return { ready: blockers.length === 0, blockers }
}
