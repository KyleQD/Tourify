import { supabase } from '@/lib/supabase'
import type {
  Permission,
  SystemRole,
  TourManagementRole,
  TourManagementPermission,
  UserPermissionContext,
  PermissionChecker,
  DataIsolationContext,
  RoleAssignmentPayload,
  PermissionValidationResult,
  TourAccessLevel,
  UserTourAccess
} from '@/types/rbac'
import { PERMISSIONS, SYSTEM_ROLES, TOUR_ACCESS_LEVELS } from '@/types/rbac'

// ---------------------------------------------------------------------------
// Helpers: map real DB rows (rbac_*) to the legacy typed shapes
// ---------------------------------------------------------------------------

function dbRoleToType(row: Record<string, unknown>): TourManagementRole {
  return {
    id: row.id as string,
    name: row.name as string,
    display_name: (row.display_name ?? row.name) as string,
    description: (row.description ?? null) as string | null,
    is_system_role: Boolean(row.is_system),
    created_at: '',
    updated_at: '',
  }
}

function dbPermissionToType(row: Record<string, unknown>): TourManagementPermission {
  return {
    id: row.id as string,
    name: row.name as string,
    display_name: (row.display_name ?? row.name) as string,
    description: (row.description ?? null) as string | null,
    category: (row.category ?? 'general') as string,
    created_at: '',
  }
}

// ---------------------------------------------------------------------------
// RBACService
// ---------------------------------------------------------------------------

export class RBACService {
  private static instance: RBACService
  private permissionCache: Map<string, UserPermissionContext> = new Map()
  private cacheTimeout = 5 * 60 * 1000

  private constructor() {}

  public static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService()
    }
    return RBACService.instance
  }

  public clearCache(): void {
    this.permissionCache.clear()
  }

  // Fetch user's permission context from real rbac_* tables.
  // `entityId` is the legacy "tourId" parameter — it scopes the look-up to a
  // specific entity when provided.
  // Falls back to ownership-based admin grants when no role assignments exist.
  public async getUserPermissionContext(
    userId: string,
    entityId?: string
  ): Promise<UserPermissionContext> {
    const cacheKey = `${userId}:${entityId || 'global'}`

    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!
    }

    try {
      // Build query against rbac_user_entity_roles
      let rolesQuery = supabase
        .from('rbac_user_entity_roles')
        .select(`
          id, entity_type, entity_id, is_active, end_at,
          rbac_roles (id, name, display_name, description, is_system)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (entityId) {
        rolesQuery = rolesQuery.eq('entity_id', entityId)
      }

      const { data: userRoles, error: rolesError } = await rolesQuery

      if (rolesError) {
        console.error('[RBAC] Error loading user roles:', rolesError.message)
        return this.emptyContext(userId, entityId)
      }

      const activeRoles = (userRoles ?? []).filter((ur) => {
        if (!ur.end_at) return true
        return new Date(ur.end_at) > new Date()
      })

      const roleIds = activeRoles.map((ur) => (ur.rbac_roles as any)?.id).filter(Boolean)

      let permissionNames: Permission[] = []

      if (roleIds.length > 0) {
        const { data: rpRows, error: rpError } = await supabase
          .from('rbac_role_permissions')
          .select('permission_id, rbac_permissions (name)')
          .in('role_id', roleIds)

        if (!rpError && rpRows) {
          permissionNames = rpRows
            .map((rp) => (rp.rbac_permissions as any)?.name as Permission)
            .filter(Boolean)
        }
      }

      // Ownership fallback: if the user owns an organizer_account they get
      // admin permissions even before any explicit role assignment is seeded.
      const ownershipPerms = await this.getOwnershipPermissions(userId)
      const allPermissions = [...new Set([...permissionNames, ...ownershipPerms])]

      const context: UserPermissionContext = {
        userId,
        tourId: entityId,
        permissions: allPermissions,
        roles: activeRoles.map((ur) => ({
          role: dbRoleToType(ur.rbac_roles as unknown as Record<string, unknown>),
          tourId: ur.entity_id as string | undefined,
          isActive: Boolean(ur.is_active),
        })),
      }

      this.permissionCache.set(cacheKey, context)
      setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTimeout)

      return context
    } catch (error) {
      console.error('[RBAC] getUserPermissionContext error:', error)
      return this.emptyContext(userId, entityId)
    }
  }

  // Grant admin.* permissions to users who own an organizer_account.
  // Also grants full permissions to venue and artist owners.
  private async getOwnershipPermissions(userId: string): Promise<Permission[]> {
    try {
      // Check organizer ownership first (fastest path)
      const { data: orgRow } = await supabase
        .from('organizer_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (orgRow) {
        // Org owners get full admin permissions
        return [
          PERMISSIONS.ADMIN_USERS,
          PERMISSIONS.ADMIN_ROLES,
          PERMISSIONS.ADMIN_SETTINGS,
          PERMISSIONS.TOURS_CREATE,
          PERMISSIONS.TOURS_VIEW,
          PERMISSIONS.TOURS_EDIT,
          PERMISSIONS.TOURS_MANAGE_STAFF,
          PERMISSIONS.EVENTS_CREATE,
          PERMISSIONS.EVENTS_VIEW,
          PERMISSIONS.EVENTS_EDIT,
          PERMISSIONS.EVENTS_MANAGE_LOGISTICS,
          PERMISSIONS.STAFF_VIEW,
          PERMISSIONS.STAFF_INVITE,
          PERMISSIONS.STAFF_MANAGE,
          PERMISSIONS.STAFF_REMOVE,
          PERMISSIONS.ANALYTICS_VIEW,
          PERMISSIONS.ANALYTICS_EXPORT,
        ]
      }

      return []
    } catch {
      return []
    }
  }

  private emptyContext(userId: string, entityId?: string): UserPermissionContext {
    return { userId, tourId: entityId, permissions: [], roles: [] }
  }

  public async createPermissionChecker(
    userId: string,
    entityId?: string
  ): Promise<PermissionChecker> {
    const context = await this.getUserPermissionContext(userId, entityId)

    return {
      hasPermission: (permission: Permission, specificEntityId?: string) => {
        return context.permissions.includes(permission)
      },
      hasAnyPermission: (permissions: Permission[], specificEntityId?: string) => {
        return permissions.some((p) => context.permissions.includes(p))
      },
      hasAllPermissions: (permissions: Permission[], specificEntityId?: string) => {
        return permissions.every((p) => context.permissions.includes(p))
      },
      hasRole: (role: SystemRole, specificEntityId?: string) => {
        return context.roles.some(
          (r) => r.role.name === role && r.isActive
        )
      },
      canAccessTour: (tourId: string) => {
        return context.roles.some((r) => r.isActive && (r.tourId === tourId || !r.tourId))
      },
    }
  }

  public async assignRole(payload: RoleAssignmentPayload): Promise<string> {
    try {
      // Resolve role id by name
      const { data: role, error: roleErr } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', payload.roleName)
        .maybeSingle()

      if (roleErr || !role) {
        throw new Error(`Role "${payload.roleName}" not found`)
      }

      const entityId = payload.tourId || payload.userId
      const entityType = payload.tourId ? 'tour' : 'user'

      const { data, error } = await supabase
        .from('rbac_user_entity_roles')
        .insert({
          user_id: payload.userId,
          entity_type: entityType,
          entity_id: entityId,
          role_id: role.id,
          is_active: true,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[RBAC] assignRole error:', error.message)
        throw error
      }

      this.clearUserCache(payload.userId)
      return (data as any).id
    } catch (error) {
      console.error('[RBAC] Error in assignRole:', error)
      throw error
    }
  }

  public async removeRole(
    userId: string,
    roleName: SystemRole,
    entityId?: string
  ): Promise<void> {
    try {
      const { data: role } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', roleName)
        .maybeSingle()

      if (!role) return

      let query = supabase
        .from('rbac_user_entity_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', role.id)

      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      const { error } = await query
      if (error) {
        console.error('[RBAC] removeRole error:', error.message)
        throw error
      }

      this.clearUserCache(userId)
    } catch (error) {
      console.error('[RBAC] Error in removeRole:', error)
      throw error
    }
  }

  private async getRoleIdByName(roleName: SystemRole): Promise<string> {
    const { data, error } = await supabase
      .from('rbac_roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (error || !data) {
      throw new Error(`Role ${roleName} not found`)
    }

    return (data as any).id
  }

  private clearUserCache(userId: string): void {
    for (const key of Array.from(this.permissionCache.keys())) {
      if (key.startsWith(`${userId}:`)) this.permissionCache.delete(key)
    }
  }

  public async validatePermission(
    userId: string,
    requiredPermissions: Permission[],
    entityId?: string
  ): Promise<PermissionValidationResult> {
    const checker = await this.createPermissionChecker(userId, entityId)

    const missingPermissions = requiredPermissions.filter(
      (p) => !checker.hasPermission(p, entityId)
    )

    return {
      isValid: missingPermissions.length === 0,
      reason: missingPermissions.length > 0
        ? `Missing permissions: ${missingPermissions.join(', ')}`
        : undefined,
      requiredPermissions,
      missingPermissions,
    }
  }

  public async getDataIsolationContext(userId: string): Promise<DataIsolationContext> {
    try {
      const { data: userRoles, error } = await supabase
        .from('rbac_user_entity_roles')
        .select('entity_id')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('[RBAC] getDataIsolationContext error:', error.message)
        throw error
      }

      const accessibleTours = (userRoles ?? [])
        .map((ur) => ur.entity_id as string)
        .filter(Boolean)

      const globalContext = await this.getUserPermissionContext(userId)
      const tourSpecificPermissions: Record<string, Permission[]> = {}

      for (const entityId of accessibleTours) {
        const ctx = await this.getUserPermissionContext(userId, entityId)
        tourSpecificPermissions[entityId] = ctx.permissions
      }

      return {
        userId,
        accessibleTours,
        globalPermissions: globalContext.permissions,
        tourSpecificPermissions,
      }
    } catch (error) {
      console.error('[RBAC] getDataIsolationContext failed:', error)
      return { userId, accessibleTours: [], globalPermissions: [], tourSpecificPermissions: {} }
    }
  }

  public async getUserTourAccess(
    userId: string,
    entityId: string
  ): Promise<UserTourAccess> {
    const checker = await this.createPermissionChecker(userId, entityId)
    const context = await this.getUserPermissionContext(userId, entityId)

    let accessLevel: TourAccessLevel = TOUR_ACCESS_LEVELS.NONE

    if (
      checker.hasPermission(PERMISSIONS.TOURS_DELETE, entityId) ||
      checker.hasPermission(PERMISSIONS.ADMIN_SETTINGS, entityId)
    ) {
      accessLevel = TOUR_ACCESS_LEVELS.ADMIN
    } else if (
      checker.hasPermission(PERMISSIONS.TOURS_MANAGE_STAFF, entityId) ||
      checker.hasPermission(PERMISSIONS.TOURS_EDIT, entityId)
    ) {
      accessLevel = TOUR_ACCESS_LEVELS.MANAGE
    } else if (
      checker.hasPermission(PERMISSIONS.EVENTS_EDIT, entityId)
    ) {
      accessLevel = TOUR_ACCESS_LEVELS.EDIT
    } else if (checker.hasPermission(PERMISSIONS.TOURS_VIEW, entityId)) {
      accessLevel = TOUR_ACCESS_LEVELS.VIEW
    }

    return {
      tourId: entityId,
      userId,
      accessLevel,
      permissions: context.permissions,
      roles: context.roles.map((r) => r.role.name as SystemRole),
      isActive: context.roles.some((r) => r.isActive),
    }
  }

  public async getAllRoles(): Promise<TourManagementRole[]> {
    const { data, error } = await supabase
      .from('rbac_roles')
      .select('id, name, display_name, description, is_system')
      .order('display_name')

    if (error) {
      console.error('[RBAC] getAllRoles error:', error.message)
      throw error
    }

    return (data ?? []).map((row) => dbRoleToType(row as Record<string, unknown>))
  }

  public async getAllPermissions(): Promise<TourManagementPermission[]> {
    const { data, error } = await supabase
      .from('rbac_permissions')
      .select('id, name, display_name, description, category')
      .order('category, display_name')

    if (error) {
      console.error('[RBAC] getAllPermissions error:', error.message)
      throw error
    }

    return (data ?? []).map((row) => dbPermissionToType(row as Record<string, unknown>))
  }

  public async getRolePermissions(roleId: string): Promise<TourManagementPermission[]> {
    const { data, error } = await supabase
      .from('rbac_role_permissions')
      .select('rbac_permissions (id, name, display_name, description, category)')
      .eq('role_id', roleId)

    if (error) {
      console.error('[RBAC] getRolePermissions error:', error.message)
      throw error
    }

    return (data ?? [])
      .map((row) => row.rbac_permissions as unknown as Record<string, unknown> | null)
      .filter(Boolean)
      .map((p) => dbPermissionToType(p!))
  }

  public async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    try {
      const { error: deleteError } = await supabase
        .from('rbac_role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deleteError) {
        console.error('[RBAC] updateRolePermissions delete error:', deleteError.message)
        throw deleteError
      }

      if (permissionIds.length > 0) {
        const { error: insertError } = await supabase
          .from('rbac_role_permissions')
          .insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })))

        if (insertError) {
          console.error('[RBAC] updateRolePermissions insert error:', insertError.message)
          throw insertError
        }
      }

      this.clearCache()
    } catch (error) {
      console.error('[RBAC] Error updating role permissions:', error)
      throw error
    }
  }

  public async createRole(
    name: string,
    displayName: string,
    description?: string
  ): Promise<TourManagementRole> {
    const { data, error } = await supabase
      .from('rbac_roles')
      .insert({ name, display_name: displayName, description, scope_type: 'entity', is_system: false })
      .select('id, name, display_name, description, is_system')
      .single()

    if (error) {
      console.error('[RBAC] createRole error:', error.message)
      throw error
    }

    return dbRoleToType(data as Record<string, unknown>)
  }

  public async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('rbac_roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system', false)

    if (error) {
      console.error('[RBAC] deleteRole error:', error.message)
      throw error
    }

    this.clearCache()
  }

  public async getUsersWithRole(
    roleName: SystemRole,
    entityId?: string
  ): Promise<Array<{ userId: string; email?: string; assignedAt: string }>> {
    const { data: role } = await supabase
      .from('rbac_roles')
      .select('id')
      .eq('name', roleName)
      .maybeSingle()

    if (!role) return []

    let query = supabase
      .from('rbac_user_entity_roles')
      .select('user_id, start_at')
      .eq('role_id', (role as any).id)
      .eq('is_active', true)

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[RBAC] getUsersWithRole error:', error.message)
      throw error
    }

    return (data ?? []).map((ur) => ({
      userId: ur.user_id as string,
      assignedAt: (ur.start_at as string) ?? '',
    }))
  }

  public async checkTourAccess(userId: string, entityId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_entity_permission', {
        p_user_id: userId,
        p_entity_type: 'tour',
        p_entity_id: entityId,
        p_permission_name: 'ASSIGN_EVENT_ROLES',
      })

      if (error) {
        console.error('[RBAC] checkTourAccess error:', error.message)
        return false
      }

      return Boolean(data)
    } catch (error) {
      console.error('[RBAC] checkTourAccess failed:', error)
      return false
    }
  }
}

export const rbacService = RBACService.getInstance()

export function requirePermission(permission: Permission, entityId?: string) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const userId = (args[0] as { userId?: string })?.userId

      if (!userId) throw new Error('User ID is required')

      const validation = await rbacService.validatePermission(userId, [permission], entityId)

      if (!validation.isValid) {
        throw new Error(`Permission denied: ${validation.reason}`)
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

export async function checkPermission(
  userId: string,
  permission: Permission,
  entityId?: string
): Promise<boolean> {
  const validation = await rbacService.validatePermission(userId, [permission], entityId)
  return validation.isValid
}

export async function requirePermissionCheck(
  userId: string,
  permission: Permission,
  entityId?: string
): Promise<void> {
  const hasPermission = await checkPermission(userId, permission, entityId)
  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission}`)
  }
}
