export interface InteropActivationEvidence {
  independentConstitutionalCompacts: number
  operationalEvidenceYears: number
  phase13ProductionProven: boolean
  approvalPackageExecuted: boolean
  localSovereigntyPreserved: boolean
  voluntaryParticipationOnly: boolean
  securityApproved: boolean
  privacyApproved: boolean
  accessibilityApproved: boolean
  jurisdictionApproved: boolean
  unresolvedCriticalBlockers: number
  policyVersion: string
}

export function evaluateInteropConventionActivation(e: InteropActivationEvidence) {
  const reasons: string[] = []
  if (e.independentConstitutionalCompacts < 2) reasons.push("INSUFFICIENT_INDEPENDENT_COMPACTS")
  if (e.operationalEvidenceYears < 2) reasons.push("INSUFFICIENT_OPERATIONAL_EVIDENCE_YEARS")
  if (!e.phase13ProductionProven) reasons.push("PHASE_13_NOT_PROVEN")
  if (!e.approvalPackageExecuted) reasons.push("APPROVAL_PACKAGE_MISSING")
  if (!e.localSovereigntyPreserved) reasons.push("LOCAL_SOVEREIGNTY_NOT_PRESERVED")
  if (!e.voluntaryParticipationOnly) reasons.push("COMPULSORY_PARTICIPATION_FORBIDDEN")
  if (!e.securityApproved || !e.privacyApproved || !e.accessibilityApproved || !e.jurisdictionApproved)
    reasons.push("REQUIRED_APPROVAL_MISSING")
  if (e.unresolvedCriticalBlockers > 0) reasons.push("CRITICAL_BLOCKERS_REMAIN")
  return { allowed: reasons.length === 0, reasons, policyVersion: e.policyVersion }
}
