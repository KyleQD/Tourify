/**
 * MAP-101 — Site map access / discovery contract.
 *
 * Discovery: owner OR active collaborator OR org logistics capability.
 * External: share tokens only (scoped, expiring, revocable) — not global is_public RLS.
 */

export const MAP101_POLICY_PREFIX = "map101_"

export const MAP101_DISCOVERY_ROLES = [
  "owner",
  "org_capability",
  "collaborator",
  "public_token",
] as const

export type Map101DiscoveryRole = (typeof MAP101_DISCOVERY_ROLES)[number]

export const MAP101_CAPABILITY_PERMS = ["logistics.view", "logistics.manage"] as const

/** Surfaces that must remain narrower than org inheritance. */
export const MAP101_SCOPED_EXTERNAL_PATHS = [
  "/api/site-maps/public/[token]",
  "/api/site-maps/shared",
] as const

export interface MapShareTokenGateInput {
  is_active: boolean | null | undefined
  expires_at: string | null | undefined
  site_map_id?: string | null
  nowMs?: number
}

export type MapShareTokenGateResult =
  | { ok: true; siteMapId: string | null }
  | { ok: false; reason: "inactive" | "expired" | "missing" }

/** Pure share-token gate used by public route + tests (MAP-101 AC). */
export function evaluateMapShareTokenGate(input: MapShareTokenGateInput): MapShareTokenGateResult {
  if (input.is_active === false) return { ok: false, reason: "inactive" }
  if (input.is_active == null && !input.site_map_id) return { ok: false, reason: "missing" }
  if (input.expires_at) {
    const expires = new Date(input.expires_at).getTime()
    const now = input.nowMs ?? Date.now()
    if (Number.isFinite(expires) && expires < now) return { ok: false, reason: "expired" }
  }
  return { ok: true, siteMapId: input.site_map_id ?? null }
}

export interface MapDiscoveryPredicate {
  isOwner: boolean
  isActiveCollaborator: boolean
  hasOrgLogisticsCapability: boolean
}

/** Who may discover a map in admin list / by-id (not public token). */
export function canDiscoverSiteMapByInheritance(pred: MapDiscoveryPredicate): boolean {
  return pred.isOwner || pred.isActiveCollaborator || pred.hasOrgLogisticsCapability
}

export function mapDiscoveryRole(pred: MapDiscoveryPredicate): Map101DiscoveryRole | "none" {
  if (pred.isOwner) return "owner"
  if (pred.hasOrgLogisticsCapability) return "org_capability"
  if (pred.isActiveCollaborator) return "collaborator"
  return "none"
}
