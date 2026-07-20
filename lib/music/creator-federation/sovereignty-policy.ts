export interface SovereigntyDecisionInput {
  power: string
  delegatedPowers: string[]
  reservedPowers: string[]
  localRatificationRequired: boolean
  localRatified: boolean
}

export function resolveFederationPower(input: SovereigntyDecisionInput): { allowed: boolean; reason: string } {
  if (input.reservedPowers.includes(input.power)) return { allowed: false, reason: "reserved_local_power" }
  if (!input.delegatedPowers.includes(input.power)) return { allowed: false, reason: "not_delegated" }
  if (input.localRatificationRequired && !input.localRatified) return { allowed: false, reason: "local_ratification_required" }
  return { allowed: true, reason: "delegated_and_effective" }
}
