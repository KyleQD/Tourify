export interface RelationshipAgreementInput {
  bothPartiesAuthorized: boolean
  legalBasisRecorded: boolean
  scopeNarrow: boolean
  dataAndIpApproved: boolean
  fundingApproved: boolean
  communicationsNonEndorsementApproved: boolean
  terminationAndDisputeRulesApproved: boolean
}
export function canActivateRelationship(i: RelationshipAgreementInput): boolean { return Object.values(i).every(Boolean); }
