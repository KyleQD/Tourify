import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { SupabaseClient } from '@supabase/supabase-js'
import { 
  VenueRole, 
  VenuePermission, 
  VenueUserRole, 
  VenueUserPermissionOverride,
  VenuePermissionAuditLog,
  PermissionName,
  SystemRoleName,
  ROLE_PERMISSION_SETS,
  UserPermissions,
  RoleWithPermissions,
  UserWithRoles,
  CreateVenueRoleData,
  UpdateVenueRoleData,
  AssignUserRoleData,
  GrantPermissionOverrideData
} from '@/types/database.types'

export class VenueRolesPermissionsService {
  private static _supabase: SupabaseClient | null = null

  private static get supabase() {
    if (!this._supabase) this._supabase = createServiceRoleClient()
    return this._supabase
  }

  // =============================================================================
  // ROLE MANAGEMENT
  // =============================================================================

  /**
   * Get all roles for a venue
   */
  static async getVenueRoles(venueId: string): Promise<VenueRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_roles')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('role_level', { ascending: false })
        .order('role_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching venue roles:', error)
      throw new Error('Failed to fetch venue roles')
    }
  }

  /**
   * Get a single role by ID
   */
  static async getVenueRole(roleId: string): Promise<VenueRole | null> {
    try {
      const { data, error } = await this.supabase
        .from('venue_roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching venue role:', error)
      throw new Error('Failed to fetch venue role')
    }
  }

  /**
   * Create a new role
   */
  static async createVenueRole(roleData: CreateVenueRoleData): Promise<VenueRole> {
    try {
      const { data, error } = await this.supabase
        .from('venue_roles')
        .insert(roleData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating venue role:', error)
      throw new Error('Failed to create venue role')
    }
  }

  /**
   * Update a role
   */
  static async updateVenueRole(roleId: string, updates: UpdateVenueRoleData): Promise<VenueRole> {
    try {
      const { data, error } = await this.supabase
        .from('venue_roles')
        .update(updates)
        .eq('id', roleId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating venue role:', error)
      throw new Error('Failed to update venue role')
    }
  }

  /**
   * Delete a role (soft delete by setting is_active to false)
   */
  static async deleteVenueRole(roleId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('venue_roles')
        .update({ is_active: false })
        .eq('id', roleId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting venue role:', error)
      throw new Error('Failed to delete venue role')
    }
  }

  // =============================================================================
  // PERMISSION MANAGEMENT
  // =============================================================================

  /**
   * Get all system permissions
   */
  static async getSystemPermissions(): Promise<VenuePermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_permissions')
        .select('*')
        .eq('is_system_permission', true)
        .order('permission_category')
        .order('permission_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching system permissions:', error)
      throw new Error('Failed to fetch system permissions')
    }
  }

  /**
   * Get permissions by category
   */
  static async getPermissionsByCategory(category: string): Promise<VenuePermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_permissions')
        .select('*')
        .eq('permission_category', category)
        .order('permission_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching permissions by category:', error)
      throw new Error('Failed to fetch permissions by category')
    }
  }

  // =============================================================================
  // ROLE-PERMISSION ASSIGNMENTS
  // =============================================================================

  /**
   * Get role with its permissions
   */
  static async getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
    try {
      const { data, error } = await this.supabase
        .from('venue_roles')
        .select(`
          *,
          venue_role_permissions!inner(
            permission_id,
            venue_permissions!inner(*)
          )
        `)
        .eq('id', roleId)
        .single()

      if (error) throw error

      if (!data) return null

      // Transform the data to match RoleWithPermissions type
      const permissions = data.venue_role_permissions?.map((rp: any) => rp.venue_permissions) || []
      
      return {
        ...data,
        permissions: permissions
      }
    } catch (error) {
      console.error('Error fetching role with permissions:', error)
      throw new Error('Failed to fetch role with permissions')
    }
  }

  /**
   * Assign permissions to a role
   */
  static async assignPermissionsToRole(
    roleId: string, 
    permissionIds: string[], 
    grantedBy: string
  ): Promise<void> {
    try {
      const rolePermissions = permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId,
        granted_by: grantedBy
      }))

      const { error } = await this.supabase
        .from('venue_role_permissions')
        .upsert(rolePermissions, { onConflict: 'role_id,permission_id' })

      if (error) throw error
    } catch (error) {
      console.error('Error assigning permissions to role:', error)
      throw new Error('Failed to assign permissions to role')
    }
  }

  /**
   * Remove permissions from a role
   */
  static async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('venue_role_permissions')
        .delete()
        .eq('role_id', roleId)
        .in('permission_id', permissionIds)

      if (error) throw error
    } catch (error) {
      console.error('Error removing permissions from role:', error)
      throw new Error('Failed to remove permissions from role')
    }
  }

  // =============================================================================
  // USER-ROLE ASSIGNMENTS
  // =============================================================================

  /**
   * Get user roles for a venue
   */
  static async getUserRoles(venueId: string, userId: string): Promise<VenueUserRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_user_roles')
        .select(`
          *,
          venue_roles!inner(*)
        `)
        .eq('venue_id', venueId)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user roles:', error)
      throw new Error('Failed to fetch user roles')
    }
  }

  /**
   * Assign a role to a user
   */
  static async assignUserRole(assignmentData: AssignUserRoleData, assignedBy: string): Promise<VenueUserRole> {
    try {
      const { data, error } = await this.supabase
        .from('venue_user_roles')
        .insert({
          ...assignmentData,
          assigned_by: assignedBy
        })
        .select()
        .single()

      if (error) throw error

      // Log the role assignment
      await this.logPermissionChange(
        assignmentData.venue_id,
        'role_assigned',
        assignmentData.user_id,
        assignmentData.role_id,
        null,
        { notes: assignmentData.notes }
      )

      return data
    } catch (error) {
      console.error('Error assigning user role:', error)
      throw new Error('Failed to assign user role')
    }
  }

  /**
   * Remove a role from a user
   */
  static async removeUserRole(venueId: string, userId: string, roleId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('venue_user_roles')
        .update({ is_active: false })
        .eq('venue_id', venueId)
        .eq('user_id', userId)
        .eq('role_id', roleId)

      if (error) throw error

      // Log the role removal
      await this.logPermissionChange(
        venueId,
        'role_removed',
        userId,
        roleId
      )
    } catch (error) {
      console.error('Error removing user role:', error)
      throw new Error('Failed to remove user role')
    }
  }

  /**
   * Get all users with their roles for a venue
   */
  static async getUsersWithRoles(venueId: string): Promise<UserWithRoles[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_user_roles')
        .select(`
          user_id,
          venue_roles!inner(*)
        `)
        .eq('venue_id', venueId)
        .eq('is_active', true)

      if (error) throw error

      // Group by user_id
      const userMap = new Map<string, UserWithRoles>()
      
      data?.forEach((item: any) => {
        const userId = item.user_id
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            roles: [],
            permissions: []
          })
        }
        userMap.get(userId)!.roles.push(item.venue_roles)
      })

      // Get permissions for each user
      for (const user of userMap.values()) {
        user.permissions = await this.getUserPermissions(venueId, user.user_id)
      }

      return Array.from(userMap.values())
    } catch (error) {
      console.error('Error fetching users with roles:', error)
      throw new Error('Failed to fetch users with roles')
    }
  }

  // =============================================================================
  // PERMISSION OVERRIDES
  // =============================================================================

  /**
   * Grant or deny a permission override for a user
   */
  static async grantPermissionOverride(
    overrideData: GrantPermissionOverrideData, 
    grantedBy: string
  ): Promise<VenueUserPermissionOverride> {
    try {
      const { data, error } = await this.supabase
        .from('venue_user_permission_overrides')
        .upsert({
          ...overrideData,
          granted_by: grantedBy
        }, { onConflict: 'venue_id,user_id,permission_id' })
        .select()
        .single()

      if (error) throw error

      // Log the permission override
      await this.logPermissionChange(
        overrideData.venue_id,
        'override_added',
        overrideData.user_id,
        null,
        overrideData.permission_id,
        { 
          is_granted: overrideData.is_granted,
          reason: overrideData.reason 
        }
      )

      return data
    } catch (error) {
      console.error('Error granting permission override:', error)
      throw new Error('Failed to grant permission override')
    }
  }

  /**
   * Remove a permission override for a user
   */
  static async removePermissionOverride(
    venueId: string, 
    userId: string, 
    permissionId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('venue_user_permission_overrides')
        .delete()
        .eq('venue_id', venueId)
        .eq('user_id', userId)
        .eq('permission_id', permissionId)

      if (error) throw error

      // Log the override removal
      await this.logPermissionChange(
        venueId,
        'override_removed',
        userId,
        null,
        permissionId
      )
    } catch (error) {
      console.error('Error removing permission override:', error)
      throw new Error('Failed to remove permission override')
    }
  }

  /**
   * Get permission overrides for a user
   */
  static async getUserPermissionOverrides(venueId: string, userId: string): Promise<VenueUserPermissionOverride[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_user_permission_overrides')
        .select(`
          *,
          venue_permissions!inner(*)
        `)
        .eq('venue_id', venueId)
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user permission overrides:', error)
      throw new Error('Failed to fetch user permission overrides')
    }
  }

  // =============================================================================
  // PERMISSION CHECKING
  // =============================================================================

  /**
   * Check if a user has a specific permission
   */
  static async userHasPermission(
    venueId: string, 
    userId: string, 
    permissionName: PermissionName
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('user_has_permission', {
          user_uuid: userId,
          venue_uuid: venueId,
          permission_name: permissionName
        })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error checking user permission:', error)
      return false
    }
  }

  /**
   * Get all permissions for a user at a venue
   */
  static async getUserPermissions(venueId: string, userId: string): Promise<PermissionName[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_permissions', {
          user_uuid: userId,
          venue_uuid: venueId
        })

      if (error) throw error
      return data?.map((p: any) => p.permission_name) || []
    } catch (error) {
      console.error('Error fetching user permissions:', error)
      return []
    }
  }

  /**
   * Get comprehensive user permissions data
   */
  static async getUserPermissionsData(venueId: string, userId: string): Promise<UserPermissions> {
    try {
      const [roleAssignments, permissionOverrides, permissions] = await Promise.all([
        this.getUserRoles(venueId, userId),
        this.getUserPermissionOverrides(venueId, userId),
        this.getUserPermissions(venueId, userId)
      ])

      return {
        permissions,
        roleAssignments,
        permissionOverrides
      }
    } catch (error) {
      console.error('Error fetching user permissions data:', error)
      throw new Error('Failed to fetch user permissions data')
    }
  }

  // =============================================================================
  // AUDIT LOGGING
  // =============================================================================

  /**
   * Log permission changes
   */
  static async logPermissionChange(
    venueId: string,
    actionType: string,
    targetUserId: string | null,
    roleId: string | null = null,
    permissionId: string | null = null,
    details: Record<string, any> | null = null
  ): Promise<void> {
    try {
      await this.supabase
        .rpc('log_permission_change', {
          venue_uuid: venueId,
          action_type: actionType,
          target_user_uuid: targetUserId,
          role_uuid: roleId,
          permission_uuid: permissionId,
          details: details
        })
    } catch (error) {
      console.error('Error logging permission change:', error)
      // Don't throw error for logging failures
    }
  }

  /**
   * Get audit log entries for a venue
   */
  static async getAuditLog(venueId: string, limit: number = 100): Promise<VenuePermissionAuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_permission_audit_log')
        .select('*')
        .eq('venue_id', venueId)
        .order('performed_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching audit log:', error)
      throw new Error('Failed to fetch audit log')
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Create default roles for a venue
   */
  static async createDefaultRoles(venueId: string, createdBy: string): Promise<void> {
    try {
      await this.supabase
        .rpc('create_default_venue_roles', {
          venue_uuid: venueId
        })
    } catch (error) {
      console.error('Error creating default roles:', error)
      throw new Error('Failed to create default roles')
    }
  }

  /**
   * Get system role permissions
   */
  static getSystemRolePermissions(roleName: SystemRoleName): PermissionName[] {
    return ROLE_PERMISSION_SETS[roleName] || []
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async userHasAnyPermission(
    venueId: string,
    userId: string,
    permissions: PermissionName[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.userHasPermission(venueId, userId, permission)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async userHasAllPermissions(
    venueId: string,
    userId: string,
    permissions: PermissionName[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.userHasPermission(venueId, userId, permission))) {
        return false
      }
    }
    return true
  }
}
