export interface RightsReference {
  publicId: string
  sourceType: string
  sourceId: string
  sourceVersion: string
  status: "active" | "suspended" | "disputed" | "expired"
  publicScopes: string[]
  refreshedAt: string
}

export function resolveRightsReference(input: { reference: RightsReference; requestedScope: string; maxAgeSeconds: number; now: Date }) {
  const { reference, requestedScope, maxAgeSeconds, now } = input
  if (reference.status !== "active") return { resolved: false, reason: reference.status }
  if (!reference.publicScopes.includes(requestedScope)) return { resolved: false, reason: "scope_not_public" }
  const age = (now.getTime() - new Date(reference.refreshedAt).getTime()) / 1000
  if (age > maxAgeSeconds) return { resolved: false, reason: "stale_source" }
  return { resolved: true, reason: "active_reference", sourceType: reference.sourceType, sourceId: reference.sourceId, sourceVersion: reference.sourceVersion }
}
