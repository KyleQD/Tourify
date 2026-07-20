export interface PublicApiAccessInput {
  clientActive: boolean
  purposeApproved: boolean
  requestedScopeAllowed: boolean
  rateLimitRemaining: number
  abuseHold: boolean
}

export function authorizePublicApiAccess(input: PublicApiAccessInput) {
  if (!input.clientActive) return { allowed: false, reason: "client_inactive" }
  if (!input.purposeApproved) return { allowed: false, reason: "purpose_unapproved" }
  if (!input.requestedScopeAllowed) return { allowed: false, reason: "scope_denied" }
  if (input.rateLimitRemaining <= 0) return { allowed: false, reason: "rate_limited" }
  if (input.abuseHold) return { allowed: false, reason: "abuse_hold" }
  return { allowed: true, reason: "authorized" }
}
