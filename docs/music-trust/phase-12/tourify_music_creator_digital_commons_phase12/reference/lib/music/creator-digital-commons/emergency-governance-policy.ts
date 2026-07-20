import type { CommonsDecision } from "./commons-domain"

export interface EmergencyGovernanceInput {
  enumeratedTrigger: boolean
  scopeNarrow: boolean
  expirySet: boolean
  dualApproval: boolean
  independentNotice: boolean
  creatorRightsTransfer: boolean
  retrospectiveReviewScheduled: boolean
  policyVersion: string
}

export function evaluateEmergencyGovernance(input: EmergencyGovernanceInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.enumeratedTrigger) reasons.push("trigger_not_authorized")
  if (!input.scopeNarrow) reasons.push("scope_not_narrow")
  if (!input.expirySet) reasons.push("expiry_required")
  if (!input.dualApproval) reasons.push("dual_approval_required")
  if (!input.independentNotice) reasons.push("independent_notice_required")
  if (input.creatorRightsTransfer) reasons.push("emergency_rights_transfer_prohibited")
  if (!input.retrospectiveReviewScheduled) reasons.push("retrospective_review_required")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
