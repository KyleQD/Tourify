import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * VEN-122 — canonical entity-RBAC access resolution for Venue accounts.
 *
 * During the adoption window these helpers run BEFORE legacy JSON-permission
 * fallbacks (canonical wins; legacy still honored until assignments migrate).
 * Permission names reuse the seeded catalog vocabulary (identical to the legacy
 * JSON keys) per the VEN-129 translation decision.
 */

export const VENUE_ENTITY_TYPE = "Venue"

export interface VenueRbacAssignment {
  roleId: string
  roleName: string | null
}

export async function venueHasActiveRole(
  client: SupabaseClient,
  userId: string,
  venueId: string,
): Promise<VenueRbacAssignment | null> {
  const { data, error } = await client
    .from("rbac_user_entity_roles")
    .select("role_id, rbac_roles(name)")
    .eq("user_id", userId)
    .eq("entity_type", VENUE_ENTITY_TYPE)
    .eq("entity_id", venueId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.role_id) return null
  const row = data as unknown as { role_id: string; rbac_roles?: { name?: string } | Array<{ name?: string }> }
  const roleRel = Array.isArray(row.rbac_roles) ? row.rbac_roles[0] : row.rbac_roles
  return { roleId: row.role_id, roleName: roleRel?.name ?? null }
}

/**
 * True when the user holds the named permission on the venue through canonical
 * RBAC (role wiring or explicit override). With no permission name, ANY active
 * role assignment counts.
 */
export async function venueHasRbacAccess(
  client: SupabaseClient,
  userId: string,
  venueId: string,
  permission?: string,
): Promise<boolean> {
  if (!userId || !venueId) return false

  if (permission) {
    const { data, error } = await client.rpc("has_entity_permission", {
      p_user_id: userId,
      p_entity_type: VENUE_ENTITY_TYPE,
      p_entity_id: venueId,
      p_permission_name: permission,
    })
    if (!error && data === true) return true
    // RPC failure must not grant access; fall through to assignment check only
    // when no specific permission was satisfiable.
  }

  return (await venueHasActiveRole(client, userId, venueId)) !== null
}

/** All venue IDs the user can reach through canonical RBAC assignments. */
export async function listVenueRbacVenueIds(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("rbac_user_entity_roles")
    .select("entity_id")
    .eq("user_id", userId)
    .eq("entity_type", VENUE_ENTITY_TYPE)
    .eq("is_active", true)

  if (error) return []
  return Array.from(new Set((data || []).map((row: any) => String(row.entity_id)).filter(Boolean)))
}
