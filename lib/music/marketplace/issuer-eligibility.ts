export interface IssuerDeficiencyInput {
  authorityAttested: boolean
  hasBeneficialOwners: boolean
  hasEligibleCatalogLink: boolean
  hasPassportSnapshot: boolean
  hasRoyaltySnapshot: boolean
  hasValuationSnapshot: boolean
  openDisputeHold: boolean
  openLienHold: boolean
  badActorFlag: boolean
}

export function evaluateIssuerDeficiencies(input: IssuerDeficiencyInput): {
  deficiencyCodes: string[]
  readinessScore: number
  eligible: boolean
} {
  const deficiencyCodes: string[] = []
  if (!input.authorityAttested) deficiencyCodes.push("authority_not_attested")
  if (!input.hasBeneficialOwners) deficiencyCodes.push("beneficial_owners_missing")
  if (!input.hasEligibleCatalogLink) deficiencyCodes.push("catalog_link_missing")
  if (!input.hasPassportSnapshot) deficiencyCodes.push("passport_snapshot_missing")
  if (!input.hasRoyaltySnapshot) deficiencyCodes.push("royalty_snapshot_missing")
  if (!input.hasValuationSnapshot) deficiencyCodes.push("valuation_snapshot_missing")
  if (input.openDisputeHold) deficiencyCodes.push("dispute_hold")
  if (input.openLienHold) deficiencyCodes.push("lien_hold")
  if (input.badActorFlag) deficiencyCodes.push("bad_actor_review")

  const max = 100
  const penalty = Math.min(max, deficiencyCodes.length * 12)
  const readinessScore = Math.max(0, max - penalty)
  return {
    deficiencyCodes,
    readinessScore,
    eligible: deficiencyCodes.length === 0,
  }
}
