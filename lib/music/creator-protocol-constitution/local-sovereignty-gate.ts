export interface SovereigntyInput {
  requestedPower: string
  delegatedPowers: string[]
  reservedPowers: string[]
  localDecisionStatus: "approved" | "rejected" | "absent" | "disputed"
  delegationExpired: boolean
}

export function evaluateLocalSovereignty(input: SovereigntyInput) {
  const reasons: string[] = []
  if (input.reservedPowers.includes(input.requestedPower)) reasons.push("POWER_RESERVED_LOCALLY")
  if (!input.delegatedPowers.includes(input.requestedPower)) reasons.push("POWER_NOT_DELEGATED")
  if (input.delegationExpired) reasons.push("DELEGATION_EXPIRED")
  if (input.localDecisionStatus !== "approved") reasons.push("LOCAL_APPROVAL_REQUIRED")
  return { allowed: reasons.length === 0, reasons }
}
