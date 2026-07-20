export type OfferingPathway = "reg_cf" | "reg_d_506b" | "reg_d_506c" | "reg_a_tier_2" | "registered_or_other"

export interface OfferingPlanningFacts {
  targetRaiseMinor: string
  publicMarketingRequired: boolean
  includeNonAccreditedInvestors: boolean
  auditedFinancialsReady: boolean
  desiredSecondaryLiquidity: boolean
}

export interface PathwayPlanningOutput {
  candidate: OfferingPathway
  warnings: string[]
  requiresCounselApproval: true
}

export function generatePlanningCandidates(facts: OfferingPlanningFacts): PathwayPlanningOutput[] {
  const outputs: PathwayPlanningOutput[] = []
  if (facts.includeNonAccreditedInvestors) {
    outputs.push({ candidate: "reg_cf", warnings: ["registered_intermediary_required", "offering_and_investor_limits_apply", "resale_restrictions_apply"], requiresCounselApproval: true })
    outputs.push({ candidate: "reg_a_tier_2", warnings: ["sec_qualification_and_ongoing_reporting", "audited_financials", "investor_limits_may_apply"], requiresCounselApproval: true })
  }
  if (facts.publicMarketingRequired) {
    outputs.push({ candidate: "reg_d_506c", warnings: ["all_purchasers_accredited", "reasonable_verification_required", "restricted_securities"], requiresCounselApproval: true })
  } else {
    outputs.push({ candidate: "reg_d_506b", warnings: ["no_general_solicitation", "restricted_securities", "purchaser_conditions_apply"], requiresCounselApproval: true })
  }
  return outputs
}
