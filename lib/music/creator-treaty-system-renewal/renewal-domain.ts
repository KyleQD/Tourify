export type RenewalState =
  | 'draft' | 'proposed' | 'under_review' | 'adopted' | 'approved'
  | 'effective' | 'implementation_due' | 'implemented' | 'partially_implemented'
  | 'non_compliant' | 'suspended' | 'revoked' | 'withdrawn' | 'expired'
  | 'superseded' | 'terminated' | 'rejected' | 'archived'

export interface VersionedAuthorityRef {
  authorityId: string
  authorityType: string
  jurisdiction: string
  effectiveAt: string
  expiresAt?: string
  suspendedAt?: string
  revokedAt?: string
  sourceManifestId: string
}

export interface RenewalDecision {
  id: string
  subjectType: string
  subjectId: string
  state: RenewalState
  policyVersion: string
  schemaVersion: string
  jurisdiction: string
  effectiveAt?: string
  expiresAt?: string
  authority: VersionedAuthorityRef
  idempotencyKey: string
  auditEventId: string
}
