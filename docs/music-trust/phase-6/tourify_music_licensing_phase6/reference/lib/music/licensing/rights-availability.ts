export type AvailabilityStatus =
  | "not_configured" | "inquiry_only" | "pre_cleared" | "quote_required"
  | "approval_required" | "temporarily_unavailable" | "territory_restricted"
  | "conflicted" | "expired" | "unavailable"

export interface ResolveAvailabilityInput {
  configured: boolean
  activeAuthority: boolean
  disputed: boolean
  expired: boolean
  territoryAllowed: boolean
  useAllowed: boolean
  preClearanceEnvelopeMatches: boolean
  quoteRuleExists: boolean
}

export function resolveAvailability(input: ResolveAvailabilityInput): AvailabilityStatus {
  if (!input.configured) return "not_configured"
  if (input.disputed) return "conflicted"
  if (input.expired) return "expired"
  if (!input.activeAuthority) return "inquiry_only"
  if (!input.territoryAllowed) return "territory_restricted"
  if (!input.useAllowed) return "unavailable"
  if (input.preClearanceEnvelopeMatches) return "pre_cleared"
  if (input.quoteRuleExists) return "quote_required"
  return "approval_required"
}
