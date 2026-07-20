export interface ServiceDirectoryEntry {
  status: "active" | "degraded" | "suspended" | "withdrawn"
  capabilities: string[]
  jurisdictions: string[]
  endpoint: string
  healthCheckedAt: string
}

export function selectEligibleServices(input: { entries: ServiceDirectoryEntry[]; capability: string; jurisdiction?: string }) {
  return input.entries.filter((entry) =>
    entry.status === "active" &&
    entry.capabilities.includes(input.capability) &&
    (!input.jurisdiction || entry.jurisdictions.includes(input.jurisdiction))
  )
}
