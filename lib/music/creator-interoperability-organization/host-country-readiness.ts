export interface HostCountryReadinessInput {
  headquartersAgreementExecuted: boolean
  domesticImplementationEffective: boolean
  premisesPlanApproved: boolean
  staffJusticeApproved: boolean
  securityPlanApproved: boolean
  bankingAndTaxOperational: boolean
  terminationAndContinuityTested: boolean
}
export function isHostCountryReady(i: HostCountryReadinessInput): boolean { return Object.values(i).every(Boolean); }
