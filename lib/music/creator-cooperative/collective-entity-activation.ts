export interface CollectiveActivationInput {
  entityFormed: boolean
  governingDocumentsApproved: boolean
  counselOpinionApproved: boolean
  competitionReviewApproved: boolean
  laborReviewApproved: boolean
  mandatesActive: boolean
  regulatorRequirementsSatisfied: boolean
  separateProductionApproval: boolean
}

export function collectiveEntityMayActivate(input: CollectiveActivationInput): boolean {
  return Object.values(input).every(Boolean)
}
