/**
 * VEN-122/VEN-124/VEN-127 — projection layer between canonical entity-RBAC
 * tables and the Venue Roles & Permissions UI contracts.
 *
 * Pure functions only: unit-testable without database or Next.js runtime.
 */

/** Canonical rbac_permissions.category → UI permission_category enum. */
export const CATEGORY_TO_UI: Record<string, string> = {
  bookings: "bookings",
  events: "events",
  ticketing: "events",
  staff: "staff",
  documents: "documents",
  analytics: "analytics",
  finance: "payroll",
  profile: "settings",
  membership: "admin",
  assets: "admin",
  media: "admin",
  compliance: "admin",
}

export const UI_CATEGORY_ORDER = [
  "bookings",
  "events",
  "staff",
  "documents",
  "analytics",
  "payroll",
  "settings",
  "communications",
  "admin",
]

export interface RbacPermissionRow {
  id: string
  name: string
  display_name?: string | null
  category?: string | null
  description?: string | null
}

export interface VenuePermissionDto {
  id: string
  permission_name: string
  permission_description: string | null
  permission_category: string
  is_system_permission: boolean
  created_at: string | null
  updated_at: string | null
}

export function uiCategoryFor(canonicalCategory: string | null | undefined): string {
  if (!canonicalCategory) return "admin"
  return CATEGORY_TO_UI[canonicalCategory] ?? "admin"
}

export function projectPermissionRow(row: RbacPermissionRow): VenuePermissionDto {
  return {
    id: row.id,
    permission_name: row.name,
    permission_description: row.description ?? row.display_name ?? null,
    permission_category: uiCategoryFor(row.category),
    is_system_permission: true,
    created_at: null,
    updated_at: null,
  }
}

export function sortPermissionsForUi<T extends { permission_category: string; permission_name: string }>(
  permissions: T[],
): T[] {
  return [...permissions].sort((a, b) => {
    const catDelta =
      UI_CATEGORY_ORDER.indexOf(a.permission_category) - UI_CATEGORY_ORDER.indexOf(b.permission_category)
    return catDelta !== 0 ? catDelta : a.permission_name.localeCompare(b.permission_name)
  })
}

export interface RbacRoleRow {
  id: string
  name: string
  display_name?: string | null
  description?: string | null
  is_system?: boolean | null
  owner_entity_type?: string | null
  owner_entity_id?: string | null
}

export interface VenueRoleDto {
  id: string
  key: string
  label: string
  description: string | null
  is_system_role: boolean
  is_active: boolean
  owner_entity_type: string | null
  owner_entity_id: string | null
  source: "rbac_roles"
  permissions?: string[]
}

export function projectRoleRow(role: RbacRoleRow, permissionNames: string[] = []): VenueRoleDto {
  return {
    id: role.id,
    key: role.name,
    label: role.display_name || role.name,
    description: role.description ?? null,
    is_system_role: role.is_system === true,
    is_active: true,
    owner_entity_type: role.owner_entity_type ?? null,
    owner_entity_id: role.owner_entity_id ?? null,
    source: "rbac_roles",
    permissions: permissionNames,
  }
}
