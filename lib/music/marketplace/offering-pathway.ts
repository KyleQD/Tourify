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
    outputs.push({
      candidate: "reg_cf",
      warnings: ["registered_intermediary_required", "offering_and_investor_limits_apply", "resale_restrictions_apply"],
      requiresCounselApproval: true,
    })
    outputs.push({
      candidate: "reg_a_tier_2",
      warnings: ["sec_qualification_and_ongoing_reporting", "audited_financials", "investor_limits_may_apply"],
      requiresCounselApproval: true,
    })
  }
  if (facts.publicMarketingRequired) {
    outputs.push({
      candidate: "reg_d_506c",
      warnings: ["all_purchasers_accredited", "reasonable_verification_required", "restricted_securities"],
      requiresCounselApproval: true,
    })
  } else {
    outputs.push({
      candidate: "reg_d_506b",
      warnings: ["no_general_solicitation", "restricted_securities", "purchaser_conditions_apply"],
      requiresCounselApproval: true,
    })
  }
  if (facts.desiredSecondaryLiquidity)
    for (const output of outputs) output.warnings.push("secondary_liquidity_requires_ats_partner_and_transfer_restrictions")
  if (!facts.auditedFinancialsReady)
    for (const output of outputs)
      if (output.candidate === "reg_a_tier_2") output.warnings.push("audited_financials_not_ready")
  return outputs
}

export interface PathwayDecisionGateInput {
  counselApproved: boolean
  partnerApproved: boolean
  approvedPartnerId?: string | null
  status: string
}

export function canLaunchOfferingFromPathway(input: PathwayDecisionGateInput): {
  allowed: boolean
  rejectionReason?: string
} {
  if (input.status !== "approved")
    return { allowed: false, rejectionReason: "pathway_not_approved" }
  if (!input.counselApproved)
    return { allowed: false, rejectionReason: "counsel_approval_required" }
  if (!input.partnerApproved)
    return { allowed: false, rejectionReason: "partner_approval_required" }
  if (!input.approvedPartnerId)
    return { allowed: false, rejectionReason: "regulated_partner_required" }
  return { allowed: true }
}
