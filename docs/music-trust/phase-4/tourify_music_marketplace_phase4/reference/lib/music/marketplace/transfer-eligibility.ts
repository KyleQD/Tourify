export interface TransferEligibilityInput {
  officialPositionMatched: boolean
  partnerAccountApproved: boolean
  transfereeApproved: boolean
  sanctionsClear: boolean
  legalHold: boolean
  instrumentSuspended: boolean
  holdingPeriodSatisfied: boolean
  jurisdictionAllowed: boolean
  transferAgentApprovalRequired: boolean
  transferAgentApproved: boolean
}

export interface TransferEligibilityResult {
  eligible: boolean
  reasonCodes: string[]
}

export function resolveTransferEligibility(input: TransferEligibilityInput): TransferEligibilityResult {
  const reasons: string[] = []
  if (!input.officialPositionMatched) reasons.push("position_not_reconciled")
  if (!input.partnerAccountApproved) reasons.push("holder_not_approved")
  if (!input.transfereeApproved) reasons.push("transferee_not_approved")
  if (!input.sanctionsClear) reasons.push("sanctions_review")
  if (input.legalHold) reasons.push("legal_hold")
  if (input.instrumentSuspended) reasons.push("instrument_suspended")
  if (!input.holdingPeriodSatisfied) reasons.push("holding_period")
  if (!input.jurisdictionAllowed) reasons.push("jurisdiction_restricted")
  if (input.transferAgentApprovalRequired && !input.transferAgentApproved) reasons.push("transfer_agent_approval_required")
  return { eligible: reasons.length === 0, reasonCodes: reasons }
}
