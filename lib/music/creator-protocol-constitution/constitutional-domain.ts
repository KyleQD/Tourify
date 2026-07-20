export interface ConstitutionalPolicyContext {
  policyVersion: string
  schemaVersion: string
  jurisdiction: string
  evaluatedAt: string
}

export interface ConstitutionalSourceReference {
  sourceType: string
  sourceId: string
  sourceVersion: string
  effectiveFrom?: string
  effectiveTo?: string
  disputed: boolean
  suspended: boolean
  revoked: boolean
}

export interface ConstitutionalDecision<TReason extends string = string> {
  allowed: boolean
  reasons: TReason[]
  requiredEvidence: string[]
  policy: ConstitutionalPolicyContext
}

export type ProvisionClass = "fundamental" | "structural" | "operational" | "advisory"
export type AmendmentClass = "fundamental" | "charter" | "breaking_protocol" | "operational" | "emergency" | "editorial"
