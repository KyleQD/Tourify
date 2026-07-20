export interface FederationMandate {
  principalOrganizationId: string
  delegateFederationId: string
  service: string
  territories: string[]
  startsAt: string
  endsAt: string
  allowSubdelegation: boolean
  status: "active" | "suspended" | "revoked" | "expired" | "superseded"
}

export function resolveMandate(input: { mandate: FederationMandate; service: string; territory: string; at: Date }): { allowed: boolean; reason: string } {
  const { mandate } = input
  if (mandate.status !== "active") return { allowed: false, reason: `mandate_${mandate.status}` }
  if (mandate.service !== input.service) return { allowed: false, reason: "service_out_of_scope" }
  if (!mandate.territories.includes(input.territory)) return { allowed: false, reason: "territory_out_of_scope" }
  const time = input.at.getTime()
  if (time < Date.parse(mandate.startsAt) || time >= Date.parse(mandate.endsAt)) return { allowed: false, reason: "outside_effective_period" }
  return { allowed: true, reason: "active_exact_scope" }
}
