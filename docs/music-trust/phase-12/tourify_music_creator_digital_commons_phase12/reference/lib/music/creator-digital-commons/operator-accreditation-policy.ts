import type { CommonsDecision } from "./commons-domain"

export interface OperatorAccreditationInput {
  legalEntityVerified: boolean
  scopeDefined: boolean
  securityReviewPassed: boolean
  accessibilityReviewPassed: boolean
  jurisdictionApproved: boolean
  exportAndExitTested: boolean
  conformancePassed: boolean
  conflictsDisclosed: boolean
  policyVersion: string
}

export function evaluateOperatorAccreditation(input: OperatorAccreditationInput): CommonsDecision {
  const reasons = Object.entries(input).filter(([key, value]) => key !== "policyVersion" && value === false).map(([key]) => key)
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
