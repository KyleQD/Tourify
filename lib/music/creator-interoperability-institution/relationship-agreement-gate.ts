interface RelationshipGateInput { agreementEffective:boolean; partiesAuthorized:boolean; requestedClaim:string; approvedClaims:string[]; }
export function evaluateRelationshipAgreement(input: RelationshipGateInput) {
  if (!input.agreementEffective) return { allowed:false, reason:'agreement_not_effective' } as const
  if (!input.partiesAuthorized) return { allowed:false, reason:'party_authority_missing' } as const
  if (!input.approvedClaims.includes(input.requestedClaim)) return { allowed:false, reason:'claim_outside_agreement' } as const
  return { allowed:true, reason:'approved' } as const
}
