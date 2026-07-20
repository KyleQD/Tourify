export interface CrossBorderTransferInput {
  purposeAuthorized: boolean
  contributionAuthorized: boolean
  transferMechanismApproved: boolean
  localizationSatisfied: boolean
  onwardTransferControlled: boolean
  retentionDefined: boolean
  legalHoldAllowsTransfer: boolean
}

export function authorizeCrossBorderTransfer(input: CrossBorderTransferInput): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = []
  if (!input.purposeAuthorized) blockers.push("purpose_not_authorized")
  if (!input.contributionAuthorized) blockers.push("contribution_not_authorized")
  if (!input.transferMechanismApproved) blockers.push("transfer_mechanism_missing")
  if (!input.localizationSatisfied) blockers.push("localization_not_satisfied")
  if (!input.onwardTransferControlled) blockers.push("onward_transfer_uncontrolled")
  if (!input.retentionDefined) blockers.push("retention_missing")
  if (!input.legalHoldAllowsTransfer) blockers.push("legal_hold_blocks_transfer")
  return { allowed: blockers.length === 0, blockers }
}
