export interface CredentialVerificationInput {
  issuerTrusted: boolean
  schemaApproved: boolean
  proofValid: boolean
  holderBindingValid: boolean
  status: "active" | "suspended" | "revoked" | "expired" | "unknown"
  jurisdictionAllowed: boolean
  scopeAllowed: boolean
  sourceRecordCurrent: boolean
  highRiskAction: boolean
}

export function verifyFederationCredential(input: CredentialVerificationInput): { valid: boolean; reason: string } {
  if (!input.issuerTrusted) return { valid: false, reason: "issuer_not_trusted" }
  if (!input.schemaApproved) return { valid: false, reason: "schema_not_approved" }
  if (!input.proofValid || !input.holderBindingValid) return { valid: false, reason: "cryptographic_verification_failed" }
  if (input.status !== "active") return { valid: false, reason: `credential_${input.status}` }
  if (!input.jurisdictionAllowed || !input.scopeAllowed) return { valid: false, reason: "scope_or_jurisdiction_denied" }
  if (input.highRiskAction && !input.sourceRecordCurrent) return { valid: false, reason: "live_source_check_required" }
  return { valid: true, reason: "verified" }
}
