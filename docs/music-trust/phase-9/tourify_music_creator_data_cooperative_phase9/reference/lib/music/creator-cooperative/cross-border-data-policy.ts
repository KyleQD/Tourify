export interface CrossBorderDecisionInput {
  sourceJurisdiction: string
  destinationJurisdiction: string
  transferMechanismActive: boolean
  localizationRequired: boolean
  destinationStorageConfirmed: boolean
  supplementarySafeguardsApproved: boolean
}

export function resolveCrossBorderDataUse(input: CrossBorderDecisionInput): { allowed: boolean; reason: string } {
  if (!input.transferMechanismActive) return { allowed: false, reason: "missing_transfer_mechanism" }
  if (input.localizationRequired && !input.destinationStorageConfirmed) return { allowed: false, reason: "localization_not_satisfied" }
  if (!input.supplementarySafeguardsApproved) return { allowed: false, reason: "supplementary_safeguards_missing" }
  return { allowed: true, reason: "approved" }
}
