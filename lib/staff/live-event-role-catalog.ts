import { LIVE_EVENT_ROLE_CATALOG_A } from "@/lib/staff/live-event-role-catalog-a"
import { LIVE_EVENT_ROLE_CATALOG_B } from "@/lib/staff/live-event-role-catalog-b"
import type { LiveEventRoleDefinition } from "@/lib/staff/live-event-role-catalog.types"

export type { LiveEventRoleDefinition, RoleCredentialDefinition } from "@/lib/staff/live-event-role-catalog.types"

export const LIVE_EVENT_ROLE_CATALOG: LiveEventRoleDefinition[] = [
  ...LIVE_EVENT_ROLE_CATALOG_A,
  ...LIVE_EVENT_ROLE_CATALOG_B,
]

const ROLE_BY_KEY = new Map(LIVE_EVENT_ROLE_CATALOG.map((role) => [role.key, role]))

export function getLiveEventRoleDefinition(key?: string | null): LiveEventRoleDefinition | null {
  if (!key) return null
  return ROLE_BY_KEY.get(key) ?? null
}

export function listLiveEventRoleDefinitions(): LiveEventRoleDefinition[] {
  return [...LIVE_EVENT_ROLE_CATALOG]
}
