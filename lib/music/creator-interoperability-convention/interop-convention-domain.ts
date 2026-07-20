export interface InteropPolicyContext {
  policyVersion: string
  schemaVersion: string
  jurisdiction: string
  evaluatedAt: string
}

export interface InteropSourceReference {
  sourceType: string
  sourceId: string
  sourceVersion: string
  disputed: boolean
  suspended: boolean
  revoked: boolean
}

export interface InteropDecision {
  allowed: boolean
  reasons: string[]
  requiredEvidence: string[]
  policy: InteropPolicyContext
}
