export interface ResearchAccessInput {
  projectApproved: boolean
  licenceActive: boolean
  ethicsApproved: boolean
  privacyApproved: boolean
  competitionApproved: boolean
  securityApproved: boolean
  purposeMatches: boolean
  cohortEligible: boolean
  outputOnly: boolean
}

export function resolveResearchAccess(input: ResearchAccessInput): { allowed: boolean; reason: string } {
  const checks: Array<[boolean, string]> = [
    [input.projectApproved, "project_not_approved"],
    [input.licenceActive, "licence_inactive"],
    [input.ethicsApproved, "ethics_not_approved"],
    [input.privacyApproved, "privacy_not_approved"],
    [input.competitionApproved, "competition_not_approved"],
    [input.securityApproved, "security_not_approved"],
    [input.purposeMatches, "purpose_mismatch"],
    [input.cohortEligible, "cohort_ineligible"],
    [input.outputOnly, "raw_access_not_allowed"],
  ]
  const failed = checks.find(([ok]) => !ok)
  return failed ? { allowed: false, reason: failed[1] } : { allowed: true, reason: "approved" }
}
