export interface OrganizationActivationInput {
  phase14EvidenceApproved: boolean;
  legalFeasibilityApproved: boolean;
  constitutiveInstrumentEffective: boolean;
  participantAuthorityVerified: boolean;
  governanceOperational: boolean;
  hostAndHeadquartersReady: boolean;
  fundingAndBudgetApproved: boolean;
  oversightAndStaffJusticeReady: boolean;
  privacySecurityAccessibilityApproved: boolean;
  independentOperationProven: boolean;
  criticalBlockers: number;
}
export function evaluateOrganizationActivation(i: OrganizationActivationInput) {
  const allowed = Object.entries(i).filter(([k]) => k !== "criticalBlockers").every(([,v]) => v === true) && i.criticalBlockers === 0;
  return { allowed, mode: allowed ? "limited_time_bound_pilot" : "disabled" };
}
