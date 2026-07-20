export interface TrustRegistryEntry {
  status: "pending" | "recognized" | "suspended" | "revoked" | "expired"
  scopes: string[]
  jurisdictions: string[]
  expiresAt?: string
}

export function isTrustedFor(input: { entry: TrustRegistryEntry; scope: string; jurisdiction?: string; now: Date }): boolean {
  const { entry, scope, jurisdiction, now } = input
  if (entry.status !== "recognized") return false
  if (!entry.scopes.includes(scope)) return false
  if (jurisdiction && !entry.jurisdictions.includes(jurisdiction)) return false
  if (entry.expiresAt && new Date(entry.expiresAt) <= now) return false
  return true
}
