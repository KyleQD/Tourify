export interface OrganizationActivationInput {
  phase14EvidenceApproved: boolean
  legalFeasibilityApproved: boolean
  constitutiveInstrumentEffective: boolean
  participantAuthorityVerified: boolean
  governanceOperational: boolean
  hostAndHeadquartersReady: boolean
  fundingAndBudgetApproved: boolean
  oversightAndStaffJusticeReady: boolean
  privacySecurityAccessibilityApproved: boolean
  independentOperationProven: boolean
  criticalBlockers: number
}

export function evaluateOrganizationActivation(i: OrganizationActivationInput) {
  const reasons: string[] = []
  if (!i.phase14EvidenceApproved) reasons.push("PHASE_14_EVIDENCE_MISSING")
  if (!i.legalFeasibilityApproved) reasons.push("LEGAL_FEASIBILITY_MISSING")
  if (!i.constitutiveInstrumentEffective) reasons.push("CONSTITUTIVE_INSTRUMENT_NOT_EFFECTIVE")
  if (!i.participantAuthorityVerified) reasons.push("PARTICIPANT_AUTHORITY_UNVERIFIED")
  if (!i.governanceOperational) reasons.push("GOVERNANCE_NOT_OPERATIONAL")
  if (!i.hostAndHeadquartersReady) reasons.push("HOST_HQ_NOT_READY")
  if (!i.fundingAndBudgetApproved) reasons.push("FUNDING_BUDGET_NOT_APPROVED")
  if (!i.oversightAndStaffJusticeReady) reasons.push("OVERSIGHT_STAFF_JUSTICE_NOT_READY")
  if (!i.privacySecurityAccessibilityApproved) reasons.push("PRIVACY_SECURITY_ACCESSIBILITY_MISSING")
  if (!i.independentOperationProven) reasons.push("INDEPENDENT_OPERATION_UNPROVEN")
  if (i.criticalBlockers > 0) reasons.push("CRITICAL_BLOCKERS_REMAIN")
  const allowed = reasons.length === 0
  return { allowed, mode: allowed ? "limited_time_bound_pilot" : "disabled", reasons }
}
